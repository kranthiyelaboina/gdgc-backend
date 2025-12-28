/**
 * Quiz Session Socket Handlers
 * 
 * Handles all real-time quiz session events
 */

import sessionManager from './sessionManager.js';
import QuizSession from '../models/QuizSession.js';
import SessionParticipant from '../models/SessionParticipant.js';
import SessionAnswer from '../models/SessionAnswer.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import jwt from 'jsonwebtoken';

/**
 * Setup quiz session socket handlers
 */
export const setupQuizSessionHandlers = (io) => {
    // Namespace for quiz sessions
    const quizNsp = io.of('/quiz');
    
    // Authentication middleware for the quiz namespace
    quizNsp.use((socket, next) => {
        const token = socket.handshake.auth.token;
        const userData = socket.handshake.auth.userData;
        
        if (userData) {
            // Student joining with their info
            socket.userData = {
                oderId: userData.oderId || userData.rollNumber,
                userName: userData.userName || userData.name,
                userPhoto: userData.userPhoto || null,
                isAdmin: false
            };
            return next();
        }
        
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userData = {
                    oderId: decoded.username || decoded.adminId,
                    userName: decoded.username || 'Admin',
                    isAdmin: true,
                    adminId: decoded.adminId
                };
                return next();
            } catch (err) {
                console.log('Invalid token, treating as student');
            }
        }
        
        // Allow connection but without verified user data
        // They'll need to identify themselves when joining
        socket.userData = null;
        next();
    });
    
    quizNsp.on('connection', (socket) => {
        console.log(`🔌 Quiz socket connected: ${socket.id}`);
        
        // ==========================================
        // ADMIN EVENTS
        // ==========================================
        
        /**
         * Admin creates a new live session
         * @param {Object} data - { quizId }
         */
        socket.on('session:create', async (data, callback) => {
            try {
                console.log('📝 session:create request:', data);
                
                if (!socket.userData?.isAdmin) {
                    return callback({ error: 'Only admins can create sessions' });
                }
                
                const { quizId } = data;
                if (!quizId) {
                    return callback({ error: 'Quiz ID is required' });
                }
                
                // Fetch quiz from database
                const quiz = await Quiz.findById(quizId);
                if (!quiz) {
                    return callback({ error: 'Quiz not found' });
                }
                
                const sessionCode = sessionManager.generateUniqueSessionCode();
                
                const adminUserName = socket.userData.userName || socket.userData.oderId || 'Admin';
                
                const dbSession = new QuizSession({
                    sessionCode,
                    quizId: quiz._id,
                    adminId: adminUserName,
                    hostAdminId: socket.userData.adminId,
                    status: 'lobby',
                    currentQuestionIndex: -1,
                    timePerQuestion: quiz.liveSettings?.timePerQuestion || 30,
                    allowLateJoin: quiz.liveSettings?.allowLateJoin || false,
                    showLeaderboardAfterEach: quiz.liveSettings?.showLeaderboardAfterEach ?? true,
                    totalQuestions: quiz.questions.length
                });
                await dbSession.save();
                
                // Create session in memory
                const memSession = sessionManager.createSession(sessionCode, {
                    sessionId: dbSession._id.toString(),
                    quizId: quiz._id.toString(),
                    quizTitle: quiz.title,
                    adminId: socket.userData.userName,
                    adminSocketId: socket.id,
                    questions: quiz.questions,
                    timePerQuestion: dbSession.timePerQuestion,
                    basePointsPerQuestion: quiz.liveSettings?.basePointsPerQuestion || 100,
                    speedBonusMax: quiz.liveSettings?.speedBonusMax || 50,
                    allowLateJoin: dbSession.allowLateJoin,
                    showLeaderboardAfterEach: dbSession.showLeaderboardAfterEach
                });
                
                // Join socket rooms
                socket.join(`session:${sessionCode}`);
                socket.join(`admin:${sessionCode}`);
                
                console.log(`✅ Session created: ${sessionCode} by admin ${socket.userData.userName}`);
                
                callback({
                    success: true,
                    sessionCode,
                    quizTitle: quiz.title,
                    questionCount: quiz.questions.length,
                    timePerQuestion: dbSession.timePerQuestion
                });
                
            } catch (error) {
                console.error('Error creating session:', error);
                callback({ error: error.message || 'Failed to create session' });
            }
        });
        
        /**
         * Student joins a session
         * @param {Object} data - { sessionCode, oderId, userName, userPhoto }
         */
        socket.on('session:join', async (data, callback) => {
            try {
                console.log('👤 session:join request:', data);
                
                const { sessionCode, oderId, userName, userPhoto } = data;
                
                if (!sessionCode || !oderId || !userName) {
                    return callback({ error: 'Session code, user ID, and name are required' });
                }
                
                // Check if session exists
                const session = sessionManager.getSession(sessionCode);
                if (!session) {
                    return callback({ error: 'Session not found. Check the code and try again.' });
                }
                
                // Check session status
                if (session.status === 'completed' || session.status === 'interrupted') {
                    return callback({ error: 'This quiz session has ended' });
                }
                
                if (session.status === 'in-progress' && !session.allowLateJoin) {
                    return callback({ error: 'This quiz has already started. Late joining is not allowed.' });
                }
                
                // Check if participant already exists (reconnection)
                const existingParticipant = sessionManager.getParticipant(sessionCode, oderId);
                
                if (existingParticipant) {
                    // Reconnection
                    sessionManager.updateParticipantConnection(sessionCode, oderId, true, socket.id);
                    
                    // Update DB
                    await SessionParticipant.findOneAndUpdate(
                        { sessionCode, oderId },
                        { isConnected: true, socketId: socket.id }
                    );
                    
                    // Join room
                    socket.join(`session:${sessionCode}`);
                    socket.sessionCode = sessionCode;
                    socket.oderId = oderId;
                    
                    // Send current state for resync
                    const resyncData = {
                        success: true,
                        reconnected: true,
                        quizTitle: session.quizTitle,
                        participantCount: sessionManager.getParticipantCount(sessionCode),
                        status: session.status,
                        currentQuestionIndex: session.currentQuestionIndex,
                        totalQuestions: session.questions.length,
                        yourScore: existingParticipant.score,
                        timePerQuestion: session.timePerQuestion
                    };
                    
                    // If quiz is in progress, send current question
                    if (session.status === 'in-progress' && session.currentQuestionIndex >= 0) {
                        const question = session.questions[session.currentQuestionIndex];
                        const timeElapsed = Date.now() - session.questionStartTime;
                        const timeRemaining = Math.max(0, (session.timePerQuestion * 1000) - timeElapsed);
                        
                        resyncData.currentQuestion = {
                            index: session.currentQuestionIndex,
                            question_id: question.question_id,
                            question_text: question.question_text,
                            image: question.image || null,
                            options: question.options.map(o => ({ option_id: o.option_id, text: o.text })),
                            timeRemaining: Math.ceil(timeRemaining / 1000)
                        };
                        resyncData.hasAnswered = existingParticipant.hasAnsweredCurrent;
                    }
                    
                    console.log(`🔄 User reconnected: ${userName} to ${sessionCode}`);
                    
                    // Notify admin
                    quizNsp.to(`admin:${sessionCode}`).emit('participant:reconnected', {
                        oderId,
                        userName,
                        totalCount: sessionManager.getParticipantCount(sessionCode)
                    });
                    
                    return callback(resyncData);
                }
                
                // New participant
                // Add to memory
                sessionManager.addParticipant(sessionCode, {
                    oderId,
                    userName,
                    userPhoto,
                    socketId: socket.id
                });
                
                // Add to database
                const dbParticipant = new SessionParticipant({
                    sessionId: session.sessionId,
                    sessionCode,
                    oderId,
                    userName,
                    userPhoto,
                    socketId: socket.id,
                    isConnected: true
                });
                await dbParticipant.save();
                
                // Join room
                socket.join(`session:${sessionCode}`);
                socket.sessionCode = sessionCode;
                socket.oderId = oderId;
                
                // Notify everyone about new participant
                quizNsp.to(`session:${sessionCode}`).emit('participant:joined', {
                    oderId,
                    userName,
                    userPhoto,
                    totalCount: sessionManager.getParticipantCount(sessionCode)
                });
                
                console.log(`✅ User joined: ${userName} to ${sessionCode}`);
                
                // Get all participants to send to the new joiner
                const allParticipants = sessionManager.getParticipants(sessionCode).map(p => ({
                    oderId: p.oderId,
                    userName: p.userName,
                    userPhoto: p.userPhoto
                }));
                
                callback({
                    success: true,
                    quizTitle: session.quizTitle,
                    participantCount: sessionManager.getParticipantCount(sessionCode),
                    participants: allParticipants,
                    status: session.status,
                    totalQuestions: session.questions.length,
                    timePerQuestion: session.timePerQuestion
                });
                
            } catch (error) {
                console.error('Error joining session:', error);
                callback({ error: error.message || 'Failed to join session' });
            }
        });
        
        /**
         * Admin broadcasts an event to all participants in a session
         * This is used for guidelines, countdown sync, and other host-to-participant events
         * @param {Object} data - { sessionCode, event, data }
         */
        socket.on('session:broadcast', async (data, callback) => {
            const safeCallback = typeof callback === 'function' ? callback : () => {};
            try {
                const { sessionCode, event, data: eventData } = data;
                
                const session = sessionManager.getSession(sessionCode);
                if (!session) {
                    return safeCallback({ error: 'Session not found' });
                }
                
                // Verify admin
                if (session.adminSocketId !== socket.id) {
                    return safeCallback({ error: 'Only the session admin can broadcast' });
                }
                
                // Broadcast the event to all participants in the session
                quizNsp.to(`session:${sessionCode}`).emit(event, eventData);
                
                console.log(`📢 Broadcast ${event} to session ${sessionCode}:`, eventData);
                
                safeCallback({ success: true });
            } catch (error) {
                console.error('Error broadcasting:', error);
                safeCallback({ error: error.message || 'Failed to broadcast' });
            }
        });
        
        /**
         * Admin starts quiz or advances to next question
         * @param {Object} data - { sessionCode }
         */
        socket.on('question:next', async (data, callback) => {
            try {
                console.log('▶️ question:next request:', data);
                
                const { sessionCode } = data;
                
                const session = sessionManager.getSession(sessionCode);
                if (!session) {
                    return callback({ error: 'Session not found' });
                }
                
                // Verify admin
                if (session.adminSocketId !== socket.id) {
                    return callback({ error: 'Only the session admin can control the quiz' });
                }
                
                // Check if there are more questions
                if (session.currentQuestionIndex >= session.questions.length - 1) {
                    return callback({ error: 'No more questions. End the quiz.' });
                }
                
                // Advance to next question
                sessionManager.advanceQuestion(sessionCode);
                
                // Get current question (without correct answer)
                const question = session.questions[session.currentQuestionIndex];
                const questionData = {
                    index: session.currentQuestionIndex,
                    total: session.questions.length,
                    question_id: question.question_id,
                    question_text: question.question_text,
                    type: question.type,
                    image: question.image || null,
                    options: question.options.map(o => ({ option_id: o.option_id, text: o.text })),
                    timeLimit: session.timePerQuestion,
                    marks: question.marks
                };
                
                // Broadcast question to all participants (without correct answer)
                quizNsp.to(`session:${sessionCode}`).emit('question:start', questionData);
                
                // Send correct answer to admin only
                quizNsp.to(`admin:${sessionCode}`).emit('question:admin-info', {
                    correctAnswers: question.correct_answers,
                    explanation: question.explanation
                });
                
                // Update DB
                await QuizSession.findOneAndUpdate(
                    { sessionCode },
                    {
                        status: 'in-progress',
                        currentQuestionIndex: session.currentQuestionIndex,
                        questionStartedAt: new Date()
                    }
                );
                
                // Set timer for question end
                sessionManager.setQuestionTimer(
                    sessionCode,
                    () => handleQuestionEnd(quizNsp, sessionCode),
                    session.timePerQuestion * 1000
                );
                
                console.log(`❓ Question ${session.currentQuestionIndex + 1} started in ${sessionCode}`);
                
                callback({
                    success: true,
                    questionIndex: session.currentQuestionIndex
                });
                
            } catch (error) {
                console.error('Error advancing question:', error);
                callback({ error: error.message || 'Failed to advance question' });
            }
        });
        
        /**
         * Student submits answer
         * @param {Object} data - { sessionCode, questionIndex, selectedOption }
         */
        socket.on('answer:submit', async (data, callback) => {
            // Handle case where callback is not provided
            const safeCallback = typeof callback === 'function' ? callback : () => {};
            
            try {
                const { sessionCode, questionIndex, selectedOption } = data;
                const oderId = socket.oderId;
                
                if (!oderId) {
                    return safeCallback({ error: 'Not authenticated to this session' });
                }
                
                const session = sessionManager.getSession(sessionCode);
                if (!session) {
                    return safeCallback({ error: 'Session not found' });
                }
                
                // Verify question index matches
                if (session.currentQuestionIndex !== questionIndex) {
                    return safeCallback({ error: 'Question has changed' });
                }
                
                // Record answer
                const result = sessionManager.recordAnswer(sessionCode, oderId, {
                    selectedOption
                });
                
                if (result.error) {
                    return safeCallback({ error: result.error });
                }
                
                // Save to database (async, don't wait)
                const question = session.questions[questionIndex];
                SessionAnswer.create({
                    sessionId: session.sessionId,
                    sessionCode,
                    oderId,
                    questionIndex,
                    questionId: question.question_id,
                    selectedOption,
                    isCorrect: result.isCorrect,
                    responseTimeMs: result.responseTimeMs,
                    pointsAwarded: result.pointsAwarded,
                    speedBonus: result.speedBonus
                }).catch(err => console.error('Error saving answer:', err));
                
                // Update participant score in DB (async)
                SessionParticipant.findOneAndUpdate(
                    { sessionCode, oderId },
                    {
                        $inc: {
                            score: result.pointsAwarded,
                            correctAnswers: result.isCorrect ? 1 : 0,
                            totalAnswered: 1
                        },
                        hasAnsweredCurrent: true
                    }
                ).catch(err => console.error('Error updating participant:', err));
                
                // Send acknowledgment to student
                safeCallback({
                    success: true,
                    acknowledged: true
                });
                
                // Notify admin about answer count update
                const stats = sessionManager.getAnswerStats(sessionCode);
                quizNsp.to(`admin:${sessionCode}`).emit('answer:stats', stats);
                
                // Check if all answered
                if (stats.answered === stats.totalParticipants && stats.totalParticipants > 0) {
                    quizNsp.to(`admin:${sessionCode}`).emit('answer:all-complete', {
                        message: 'All participants have answered'
                    });
                }
                
            } catch (error) {
                console.error('Error submitting answer:', error);
                if (typeof callback === 'function') {
                    callback({ error: error.message || 'Failed to submit answer' });
                }
            }
        });
        
        /**
         * Admin skips remaining time (ends question early)
         * @param {Object} data - { sessionCode }
         */
        socket.on('question:skip', async (data, callback) => {
            try {
                const { sessionCode } = data;
                
                const session = sessionManager.getSession(sessionCode);
                if (!session) {
                    return callback({ error: 'Session not found' });
                }
                
                if (session.adminSocketId !== socket.id) {
                    return callback({ error: 'Only the session admin can skip' });
                }
                
                // Clear timer and trigger question end
                sessionManager.clearQuestionTimer(sessionCode);
                handleQuestionEnd(quizNsp, sessionCode);
                
                callback({ success: true });
                
            } catch (error) {
                console.error('Error skipping question:', error);
                callback({ error: error.message || 'Failed to skip' });
            }
        });
        
        /**
         * Admin ends quiz
         * @param {Object} data - { sessionCode }
         */
        socket.on('session:end', async (data, callback) => {
            try {
                const { sessionCode } = data;
                
                const session = sessionManager.getSession(sessionCode);
                if (!session) {
                    return callback({ error: 'Session not found' });
                }
                
                if (session.adminSocketId !== socket.id) {
                    return callback({ error: 'Only the session admin can end the quiz' });
                }
                
                await handleQuizComplete(quizNsp, sessionCode);
                
                callback({ success: true });
                
            } catch (error) {
                console.error('Error ending session:', error);
                callback({ error: error.message || 'Failed to end session' });
            }
        });
        
        /**
         * Admin gets current session state
         */
        socket.on('session:state', (data, callback) => {
            const { sessionCode } = data;
            
            const session = sessionManager.getSession(sessionCode);
            if (!session) {
                return callback({ error: 'Session not found' });
            }
            
            const participants = sessionManager.getParticipants(sessionCode);
            const leaderboard = sessionManager.getLeaderboard(sessionCode, 50);
            
            callback({
                success: true,
                status: session.status,
                currentQuestionIndex: session.currentQuestionIndex,
                totalQuestions: session.questions.length,
                participantCount: participants.length,
                participants: participants.map(p => ({
                    oderId: p.oderId,
                    userName: p.userName,
                    userPhoto: p.userPhoto,
                    score: p.score,
                    isConnected: p.isConnected
                })),
                leaderboard
            });
        });
        
        /**
         * Student leaves session
         */
        socket.on('session:leave', async (data) => {
            const { sessionCode } = data;
            const oderId = socket.oderId;
            
            if (!oderId || !sessionCode) return;
            
            sessionManager.updateParticipantConnection(sessionCode, oderId, false);
            
            // Update DB
            await SessionParticipant.findOneAndUpdate(
                { sessionCode, oderId },
                { isConnected: false, lastDisconnectedAt: new Date() }
            );
            
            socket.leave(`session:${sessionCode}`);
            
            // Notify admin
            const session = sessionManager.getSession(sessionCode);
            if (session) {
                quizNsp.to(`admin:${sessionCode}`).emit('participant:left', {
                    oderId,
                    totalCount: sessionManager.getParticipantCount(sessionCode)
                });
            }
        });
        
        /**
         * Handle disconnect
         */
        socket.on('disconnect', async () => {
            console.log(`🔌 Quiz socket disconnected: ${socket.id}`);
            
            // Check if admin disconnected
            const adminSession = sessionManager.findSessionByAdminSocket(socket.id);
            if (adminSession) {
                const { sessionCode, session } = adminSession;
                
                if (session.status === 'in-progress') {
                    // Pause the quiz
                    sessionManager.clearQuestionTimer(sessionCode);
                    session.status = 'paused';
                    session.pausedAt = new Date();
                    
                    // Notify participants
                    quizNsp.to(`session:${sessionCode}`).emit('session:paused', {
                        message: 'Host disconnected. Waiting for reconnection...'
                    });
                    
                    // Set grace period timer (2 minutes)
                    session.adminDisconnectTimer = setTimeout(async () => {
                        const currentSession = sessionManager.getSession(sessionCode);
                        if (currentSession && currentSession.status === 'paused') {
                            // End session as interrupted
                            currentSession.status = 'interrupted';
                            
                            await QuizSession.findOneAndUpdate(
                                { sessionCode },
                                { status: 'interrupted', completedAt: new Date() }
                            );
                            
                            quizNsp.to(`session:${sessionCode}`).emit('session:interrupted', {
                                message: 'Host did not reconnect. Session ended.'
                            });
                            
                            // Clean up after a delay
                            setTimeout(() => {
                                sessionManager.removeSession(sessionCode);
                            }, 60000);
                        }
                    }, 120000); // 2 minutes
                    
                    // Update DB
                    await QuizSession.findOneAndUpdate(
                        { sessionCode },
                        { status: 'paused', pausedAt: new Date() }
                    );
                }
                
                console.log(`⚠️ Admin disconnected from session ${sessionCode}`);
                return;
            }
            
            // Check if participant disconnected
            const participantInfo = sessionManager.findParticipantBySocket(socket.id);
            if (participantInfo) {
                const { sessionCode, oderId, participant } = participantInfo;
                
                sessionManager.updateParticipantConnection(sessionCode, oderId, false);
                
                // Update DB
                await SessionParticipant.findOneAndUpdate(
                    { sessionCode, oderId },
                    { isConnected: false, lastDisconnectedAt: new Date() }
                );
                
                // Notify admin
                quizNsp.to(`admin:${sessionCode}`).emit('participant:disconnected', {
                    oderId,
                    userName: participant.userName,
                    totalConnected: sessionManager.getParticipants(sessionCode).filter(p => p.isConnected).length
                });
                
                console.log(`👤 Participant ${participant.userName} disconnected from ${sessionCode}`);
            }
        });
    });
    
    return quizNsp;
};

/**
 * Handle question time expiry
 * @param {Object} quizNsp - The Socket.io /quiz namespace
 * @param {string} sessionCode - The session code
 */
async function handleQuestionEnd(quizNsp, sessionCode) {
    try {
        const session = sessionManager.getSession(sessionCode);
        if (!session) {
            console.log(`⚠️ Session ${sessionCode} not found in handleQuestionEnd`);
            return;
        }
        
        const question = session.questions[session.currentQuestionIndex];
        if (!question) {
            console.log(`⚠️ Question not found at index ${session.currentQuestionIndex}`);
            return;
        }
        
        const leaderboard = sessionManager.getLeaderboard(sessionCode, 10);
        const stats = sessionManager.getAnswerStats(sessionCode);
        
        // Prepare question results
        const questionResult = {
            questionIndex: session.currentQuestionIndex,
            correctAnswers: question.correct_answers || [],
            explanation: question.explanation || null,
            stats: {
                totalParticipants: stats?.totalParticipants || 0,
                answered: stats?.answered || 0,
                optionCounts: stats?.optionCounts || {}
            },
            leaderboard: leaderboard || [],
            isLastQuestion: session.currentQuestionIndex >= session.questions.length - 1
        };
        
        // Send results to all with their personal score
        const participants = sessionManager.getParticipants(sessionCode);
        
        // Broadcast to room
        quizNsp.to(`session:${sessionCode}`).emit('question:end', questionResult);
        
        // Send individual results to each participant
        for (const participant of participants) {
            if (participant.socketId) {
                try {
                    const wasCorrect = question.correct_answers?.includes(participant.currentAnswer) || false;
                    const lastResult = participant.lastAnswerResult || {};
                    quizNsp.to(participant.socketId).emit('question:personal-result', {
                        wasCorrect,
                        yourAnswer: participant.currentAnswer,
                        pointsEarned: lastResult.pointsAwarded || 0,
                        basePoints: lastResult.basePoints || 0,
                        speedBonus: lastResult.speedBonus || 0,
                        yourScore: participant.score || 0,
                        yourRank: leaderboard.findIndex(l => l.oderId === participant.oderId) + 1 || participants.length
                    });
                } catch (err) {
                    console.error(`Error sending personal result to ${participant.oderId}:`, err.message);
                }
            }
        }
        
        // Update participant scores in DB (don't await, fire and forget)
        for (const participant of participants) {
            SessionParticipant.findOneAndUpdate(
                { sessionCode, oderId: participant.oderId },
                {
                    score: participant.score || 0,
                    correctAnswers: participant.correctAnswers || 0,
                    totalAnswered: participant.totalAnswered || 0,
                    hasAnsweredCurrent: false
                }
            ).catch(err => console.error(`Error updating participant ${participant.oderId}:`, err.message));
        }
        
        console.log(`⏱️ Question ${session.currentQuestionIndex + 1} ended in ${sessionCode}`);
        
        // Check if quiz is complete
        if (session.currentQuestionIndex >= session.questions.length - 1) {
            // Auto-end after showing results (give time to see results)
            setTimeout(() => {
                handleQuizComplete(quizNsp, sessionCode).catch(err => {
                    console.error('Error in handleQuizComplete:', err.message);
                });
            }, 5000);
        }
    } catch (error) {
        console.error(`❌ Error in handleQuestionEnd for ${sessionCode}:`, error);
    }
}

/**
 * Handle quiz completion
 * @param {Object} quizNsp - The Socket.io /quiz namespace
 * @param {string} sessionCode - The session code
 */
async function handleQuizComplete(quizNsp, sessionCode) {
    try {
        const session = sessionManager.getSession(sessionCode);
        if (!session || session.status === 'completed') {
            console.log(`⚠️ Session ${sessionCode} not found or already completed`);
            return;
        }
        
        sessionManager.endSession(sessionCode);
        
        const finalLeaderboard = sessionManager.getLeaderboard(sessionCode, 100) || [];
        const participants = sessionManager.getParticipants(sessionCode) || [];
        const totalQuestions = session.questions?.length || 0;
        
        // Broadcast final results
        quizNsp.to(`session:${sessionCode}`).emit('quiz:complete', {
            leaderboard: finalLeaderboard,
            totalQuestions: totalQuestions,
            sessionCode
        });
        
        // Store quiz attempts for each participant (same as standard quiz)
        const quizStartedAt = session.startedAt || new Date();
        const quizEndedAt = new Date();
        const timeTakenSec = Math.round((quizEndedAt - quizStartedAt) / 1000);
        
        for (const participant of participants) {
            // Send individual final results via socket
            if (participant.socketId) {
                try {
                    const rank = finalLeaderboard.findIndex(l => l.oderId === participant.oderId) + 1;
                    quizNsp.to(participant.socketId).emit('quiz:personal-final', {
                        finalRank: rank || participants.length,
                        finalScore: participant.score || 0,
                        correctAnswers: participant.correctAnswers || 0,
                        totalQuestions: totalQuestions
                    });
                } catch (err) {
                    console.error(`Error sending final result to ${participant.oderId}:`, err.message);
                }
            }
            
            // Store quiz attempt in database (matching standard quiz format)
            try {
                const correctAnswers = participant.correctAnswers || 0;
                const basePointsPerQuestion = session.basePointsPerQuestion || 100;
                const baseScore = correctAnswers * basePointsPerQuestion;
                const totalMarks = totalQuestions * basePointsPerQuestion;
                const percentage = totalMarks > 0 ? Math.round((baseScore / totalMarks) * 100) : 0;
                
                // Get participant's answers from SessionAnswer collection
                const sessionAnswers = await SessionAnswer.find({
                    sessionCode,
                    oderId: participant.oderId
                }).lean();
                
                // Build responses array matching QuizAttempt schema
                const responses = sessionAnswers.map(answer => ({
                    question_id: answer.questionId,
                    selected_options: answer.selectedOption ? [answer.selectedOption] : [],
                    is_correct: answer.isCorrect || false,
                    marks_awarded: answer.isCorrect ? basePointsPerQuestion : 0
                }));
                
                // Use findOneAndUpdate with upsert to handle duplicates gracefully
                // In live quiz, we update if exists (re-participation in same session)
                await QuizAttempt.findOneAndUpdate(
                    { 
                        quiz_id: session.quizId.toString(), 
                        user_id: participant.oderId 
                    },
                    {
                        quiz_id: session.quizId.toString(),
                        quiz_title: `[LIVE] ${session.quizTitle || 'Live Quiz'}`,
                        user_id: participant.oderId,
                        user_name: participant.userName || participant.oderId,
                        score: baseScore,
                        percentage: Math.max(0, Math.min(100, percentage)),
                        total_marks: totalMarks,
                        questions_correct: correctAnswers,
                        total_questions: totalQuestions,
                        time_taken_sec: timeTakenSec,
                        submitted_at: quizEndedAt,
                        responses: responses
                    },
                    { upsert: true, new: true }
                );
                
                console.log(`📝 Stored quiz attempt for ${participant.oderId} (Live Quiz)`);
            } catch (attemptErr) {
                console.error(`Error storing quiz attempt for ${participant.oderId}:`, attemptErr.message);
            }
        }
        
        // Update DB session status
        QuizSession.findOneAndUpdate(
            { sessionCode },
            {
                status: 'completed',
                completedAt: new Date()
            }
        ).catch(err => console.error('Error updating session status:', err.message));
        
        console.log(`🏁 Quiz completed: ${sessionCode} - ${participants.length} attempts stored`);
        
        // Schedule cleanup (remove from memory after 5 minutes)
        setTimeout(() => {
            sessionManager.removeSession(sessionCode);
        }, 300000);
    } catch (error) {
        console.error(`❌ Error in handleQuizComplete for ${sessionCode}:`, error);
    }
}

export default setupQuizSessionHandlers;

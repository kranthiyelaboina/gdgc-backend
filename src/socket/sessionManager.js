
const activeSessions = new Map();

export const generateSessionCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export const generateUniqueSessionCode = () => {
    let code;
    let attempts = 0;
    do {
        code = generateSessionCode();
        attempts++;
        if (attempts > 100) {
            throw new Error('Failed to generate unique session code');
        }
    } while (activeSessions.has(code));
    return code;
};

export const createSession = (sessionCode, sessionData) => {
    const session = {
        sessionCode,
        sessionId: sessionData.sessionId,
        quizId: sessionData.quizId,
        quizTitle: sessionData.quizTitle,
        adminId: sessionData.adminId,
        adminSocketId: sessionData.adminSocketId,
        questions: sessionData.questions, 
        currentQuestionIndex: -1, 
        questionStartTime: null,
        timePerQuestion: sessionData.timePerQuestion || 30,
        status: 'lobby',
        basePointsPerQuestion: sessionData.basePointsPerQuestion || 100,
        speedBonusMax: sessionData.speedBonusMax || 50,
        allowLateJoin: sessionData.allowLateJoin || false,
        showLeaderboardAfterEach: sessionData.showLeaderboardAfterEach ?? true,
        participants: new Map(), 
        questionTimer: null, 
        adminDisconnectTimer: null, 
        createdAt: new Date()
    };

    activeSessions.set(sessionCode, session);
    console.log(`📝 Session created: ${sessionCode} for quiz: ${session.quizTitle}`);
    return session;
};

export const getSession = (sessionCode) => {
    return activeSessions.get(sessionCode);
};

export const sessionExists = (sessionCode) => {
    return activeSessions.has(sessionCode);
};

export const addParticipant = (sessionCode, participantData) => {
    const session = activeSessions.get(sessionCode);
    if (!session) {
        throw new Error('Session not found');
    }

    const participant = {
        oderId: participantData.oderId,
        userName: participantData.userName,
        userPhoto: participantData.userPhoto || null,
        socketId: participantData.socketId,
        score: 0,
        correctAnswers: 0,
        totalAnswered: 0,
        currentAnswer: null,
        hasAnsweredCurrent: false,
        isConnected: true,
        joinedAt: new Date()
    };

    session.participants.set(participantData.oderId, participant);
    console.log(`👤 Participant joined ${sessionCode}: ${participantData.userName} (${participantData.oderId})`);
    return participant;
};

export const getParticipant = (sessionCode, oderId) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return null;
    return session.participants.get(oderId);
};

export const updateParticipant = (sessionCode, oderId, updates) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return null;

    const participant = session.participants.get(oderId);
    if (!participant) return null;

    Object.assign(participant, updates);
    return participant;
};

export const getParticipants = (sessionCode) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return [];
    return Array.from(session.participants.values());
};

export const getParticipantCount = (sessionCode) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return 0;
    return session.participants.size;
};

export const updateSessionStatus = (sessionCode, status) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return null;
    session.status = status;
    return session;
};

export const updateAdminSocketId = (sessionCode, socketId) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return null;
    session.adminSocketId = socketId;
    return session;
};

export const advanceQuestion = (sessionCode) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return null;

    if (session.questionTimer) {
        clearTimeout(session.questionTimer);
        session.questionTimer = null;
    }

    session.participants.forEach(participant => {
        participant.hasAnsweredCurrent = false;
        participant.currentAnswer = null;
    });

    session.currentQuestionIndex++;
    session.questionStartTime = Date.now();

    if (session.currentQuestionIndex === 0) {
        session.status = 'in-progress';
    }

    console.log(`❓ Question ${session.currentQuestionIndex + 1}/${session.questions.length} started in ${sessionCode}`);
    return session;
};

export const recordAnswer = (sessionCode, oderId, answerData) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return { error: 'Session not found' };

    const participant = session.participants.get(oderId);
    if (!participant) return { error: 'Participant not found' };

    if (participant.hasAnsweredCurrent) {
        return { error: 'Already answered this question' };
    }

    const responseTimeMs = Date.now() - session.questionStartTime;
    const timeLimit = session.timePerQuestion * 1000;

    if (responseTimeMs > timeLimit + 1000) {
        return { error: 'Time expired for this question' };
    }

    const question = session.questions[session.currentQuestionIndex];
    if (!question) return { error: 'Question not found' };

    const isCorrect = question.correct_answers.includes(answerData.selectedOption);

    let pointsAwarded = 0;
    let speedBonus = 0;

    if (isCorrect) {
        pointsAwarded = session.basePointsPerQuestion;

        const timeRatio = 1 - (responseTimeMs / timeLimit);
        speedBonus = Math.round(timeRatio * session.speedBonusMax);
        if (speedBonus < 0) speedBonus = 0;

        pointsAwarded += speedBonus;
    }

    participant.hasAnsweredCurrent = true;
    participant.currentAnswer = answerData.selectedOption;
    participant.score += pointsAwarded;
    participant.totalAnswered++;
    if (isCorrect) participant.correctAnswers++;

    console.log(`✏️ Answer from ${participant.userName}: ${isCorrect ? '✅ Correct' : '❌ Wrong'} (+${pointsAwarded} pts) in ${responseTimeMs}ms`);

    return {
        success: true,
        isCorrect,
        pointsAwarded,
        speedBonus,
        responseTimeMs,
        newScore: participant.score
    };
};

export const getLeaderboard = (sessionCode, limit = 10) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return [];

    const participants = Array.from(session.participants.values());

    participants.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
        return a.userName.localeCompare(b.userName);
    });

    return participants.slice(0, limit).map((p, index) => ({
        rank: index + 1,
        oderId: p.oderId,
        userName: p.userName,
        userPhoto: p.userPhoto,
        score: p.score,
        correctAnswers: p.correctAnswers,
        totalAnswered: p.totalAnswered
    }));
};

export const getAnswerStats = (sessionCode) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return null;

    const question = session.questions[session.currentQuestionIndex];
    if (!question) return null;

    const stats = {
        totalParticipants: session.participants.size,
        answered: 0,
        optionCounts: {}
    };

    question.options.forEach(opt => {
        stats.optionCounts[opt.option_id] = 0;
    });

    session.participants.forEach(participant => {
        if (participant.hasAnsweredCurrent) {
            stats.answered++;
            if (participant.currentAnswer && stats.optionCounts[participant.currentAnswer] !== undefined) {
                stats.optionCounts[participant.currentAnswer]++;
            }
        }
    });

    return stats;
};

export const setQuestionTimer = (sessionCode, callback, timeMs) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return;

    if (session.questionTimer) {
        clearTimeout(session.questionTimer);
    }

    session.questionTimer = setTimeout(callback, timeMs);
};

export const clearQuestionTimer = (sessionCode) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return;

    if (session.questionTimer) {
        clearTimeout(session.questionTimer);
        session.questionTimer = null;
    }
};

export const updateParticipantConnection = (sessionCode, oderId, isConnected, socketId = null) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return null;

    const participant = session.participants.get(oderId);
    if (!participant) return null;

    participant.isConnected = isConnected;
    if (socketId) participant.socketId = socketId;
    if (!isConnected) participant.lastDisconnectedAt = new Date();

    return participant;
};

export const findParticipantBySocket = (socketId) => {
    for (const [sessionCode, session] of activeSessions) {
        for (const [oderId, participant] of session.participants) {
            if (participant.socketId === socketId) {
                return { sessionCode, oderId, participant };
            }
        }
    }
    return null;
};

export const findSessionByAdminSocket = (socketId) => {
    for (const [sessionCode, session] of activeSessions) {
        if (session.adminSocketId === socketId) {
            return { sessionCode, session };
        }
    }
    return null;
};

export const isQuizAdmin = (sessionCode, oderId) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return false;
    return session.adminId === oderId;
};

export const endSession = (sessionCode) => {
    const session = activeSessions.get(sessionCode);
    if (!session) return null;

    if (session.questionTimer) {
        clearTimeout(session.questionTimer);
    }
    if (session.adminDisconnectTimer) {
        clearTimeout(session.adminDisconnectTimer);
    }

    session.status = 'completed';
    console.log(`🏁 Session ended: ${sessionCode}`);

    return session;
};

export const removeSession = (sessionCode) => {
    const session = activeSessions.get(sessionCode);
    if (session) {

        if (session.questionTimer) clearTimeout(session.questionTimer);
        if (session.adminDisconnectTimer) clearTimeout(session.adminDisconnectTimer);
    }
    activeSessions.delete(sessionCode);
    console.log(`🗑️ Session removed from memory: ${sessionCode}`);
};

export const getAllActiveSessions = () => {
    const sessions = [];
    for (const [code, session] of activeSessions) {
        sessions.push({
            sessionCode: code,
            quizTitle: session.quizTitle,
            status: session.status,
            participantCount: session.participants.size,
            currentQuestionIndex: session.currentQuestionIndex,
            totalQuestions: session.questions.length,
            createdAt: session.createdAt
        });
    }
    return sessions;
};

export const restoreSession = (sessionCode, sessionData) => {

    activeSessions.set(sessionCode, sessionData);
    console.log(`🔄 Session restored: ${sessionCode}`);
    return sessionData;
};

export default {
    generateSessionCode,
    generateUniqueSessionCode,
    createSession,
    getSession,
    sessionExists,
    addParticipant,
    getParticipant,
    updateParticipant,
    getParticipants,
    getParticipantCount,
    updateSessionStatus,
    updateAdminSocketId,
    advanceQuestion,
    recordAnswer,
    getLeaderboard,
    getAnswerStats,
    setQuestionTimer,
    clearQuestionTimer,
    updateParticipantConnection,
    findParticipantBySocket,
    findSessionByAdminSocket,
    isQuizAdmin,
    endSession,
    removeSession,
    getAllActiveSessions,
    restoreSession
};

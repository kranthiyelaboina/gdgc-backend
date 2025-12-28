import Leaderboard from '../models/Leaderboard.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';

class QuizController {
    // Validate quiz code and return quiz info
    async validateQuizCode(req, res) {
        try {
            const { code } = req.params;
            
            const quiz = await Quiz.findOne({ code: code });
            
            if (!quiz) {
                return res.status(404).json({
                    success: false,
                    valid: false,
                    message: 'Invalid quiz code'
                });
            }
            
            if (!quiz.isActive) {
                return res.status(400).json({
                    success: false,
                    valid: false,
                    message: 'This quiz is not currently active'
                });
            }
            
            res.status(200).json({
                success: true,
                valid: true,
                quiz: {
                    id: quiz._id,
                    quiz_id: quiz.quiz_id,
                    title: quiz.title,
                    description: quiz.description,
                    category: quiz.category,
                    difficulty: quiz.difficulty,
                    time_limit_sec: quiz.time_limit_sec,
                    total_marks: quiz.total_marks,
                    questions_count: quiz.questions.length,
                    isActive: quiz.isActive
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                valid: false,
                message: 'Error validating quiz code',
                error: error.message
            });
        }
    }

    // Admin: Create quiz with JSON data (new format)
    async createQuiz(req, res) {
        try {
            const quizData = req.body;
            
            // Debug: Log received quiz data to verify image URLs
            console.log('Creating quiz with data:', JSON.stringify({
                quiz_id: quizData.quiz_id,
                questions: quizData.questions?.map(q => ({
                    question_id: q.question_id,
                    image: q.image,
                    question_text: q.question_text?.substring(0, 50)
                }))
            }, null, 2));
            
            // Validate required fields
            const requiredFields = ['quiz_id', 'title', 'description', 'category', 'difficulty', 'time_limit_sec', 'total_marks', 'questions'];
            for (const field of requiredFields) {
                if (!quizData[field]) {
                    return res.status(400).json({ 
                        message: `Missing required field: ${field}` 
                    });
                }
            }
            
            // Generate 6-digit code for quiz access
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Validate questions structure
            if (!Array.isArray(quizData.questions) || quizData.questions.length === 0) {
                return res.status(400).json({ 
                    message: 'Questions array is required and cannot be empty' 
                });
            }
            
            // Validate each question
            for (const question of quizData.questions) {
                if (!question.question_id || !question.type || !question.question_text || 
                    !question.options || !question.correct_answers || question.marks === undefined) {
                    return res.status(400).json({ 
                        message: 'Each question must have question_id, type, question_text, options, correct_answers, and marks' 
                    });
                }
                
                if (!['single_choice', 'multiple_choice'].includes(question.type)) {
                    return res.status(400).json({ 
                        message: 'Question type must be either single_choice or multiple_choice' 
                    });
                }
            }
            
            const quiz = new Quiz({
                ...quizData,
                code,
                created_by: req.admin?.username || quizData.created_by || 'admin',
                isActive: false // Quiz starts inactive, admin can activate later
            });
            
            await quiz.save();
            res.status(201).json({ 
                success: true,
                message: 'Quiz created successfully', 
                quiz: { 
                    id: quiz._id,
                    quiz_id: quiz.quiz_id,
                    code: quiz.code,
                    title: quiz.title,
                    category: quiz.category,
                    difficulty: quiz.difficulty,
                    total_marks: quiz.total_marks,
                    time_limit_sec: quiz.time_limit_sec,
                    questions_count: quiz.questions.length,
                    isActive: quiz.isActive,
                    created_at: quiz.createdAt
                },
                admin_info: {
                    quiz_access_code: quiz.code,
                    share_with_users: `Share this code with users: ${quiz.code}`,
                    start_quiz_endpoint: '/api/quiz/start',
                    toggle_status_endpoint: `/api/quiz/${quiz._id}/toggle`
                }
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({ 
                    message: 'Quiz with this quiz_id already exists' 
                });
            }
            res.status(500).json({ message: 'Error creating quiz', error: error.message });
        }
    }

    // Admin: Get all quizzes
    async getAllQuizzes(req, res) {
        try {
            const quizzes = await Quiz.find();
            const formattedQuizzes = quizzes.map(quiz => ({
                id: quiz._id,
                quiz_id: quiz.quiz_id,
                title: quiz.title,
                description: quiz.description,
                category: quiz.category,
                difficulty: quiz.difficulty,
                tags: quiz.tags,
                time_limit_sec: quiz.time_limit_sec,
                total_marks: quiz.total_marks,
                created_by: quiz.created_by,
                code: quiz.code,
                isActive: quiz.isActive,
                questions_count: quiz.questions.length,
                createdAt: quiz.createdAt,
                startTime: quiz.startTime,
                endTime: quiz.endTime
            }));
            res.status(200).json({ quizzes: formattedQuizzes });
        } catch (error) {
            res.status(500).json({ message: 'Error fetching quizzes', error: error.message });
        }
    }

    // User: Start quiz with code
    async startQuiz(req, res) {
        try {
            const { code, rollNo, name } = req.body;
            
            // Enhanced validation with debugging info
            if (!code || !rollNo) {
                return res.status(400).json({ 
                    message: 'Quiz code and roll number are required',
                    received: {
                        code: code || null,
                        rollNo: rollNo || null,
                        body: req.body
                    }
                });
            }
            
            const quiz = await Quiz.findOne({ code, isActive: true });
            
            if (!quiz) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Invalid quiz code or quiz not active' 
                });
            }

            // Check if user has already attempted this quiz
            const existingAttempt = await QuizAttempt.findOne({ 
                quiz_id: quiz.quiz_id, 
                user_id: rollNo 
            });
            
            if (existingAttempt) {
                return res.status(409).json({
                    success: false,
                    message: 'You have already attempted this quiz',
                    attempt_details: {
                        quiz_title: existingAttempt.quiz_title,
                        score: existingAttempt.score,
                        percentage: existingAttempt.percentage,
                        submitted_at: existingAttempt.submitted_at,
                        time_taken: `${Math.floor(existingAttempt.time_taken_sec / 60)}:${(existingAttempt.time_taken_sec % 60).toString().padStart(2, '0')}`
                    }
                });
            }
            
            // Check if quiz time is valid (if startTime and endTime are set)
            const now = new Date();
            if (quiz.startTime && quiz.endTime) {
                if (now < quiz.startTime || now > quiz.endTime) {
                    return res.status(400).json({ 
                        success: false,
                        message: 'Quiz is not available at this time',
                        details: {
                            startTime: quiz.startTime,
                            endTime: quiz.endTime,
                            currentTime: now
                        }
                    });
                }
            }
            
            // Return quiz without correct answers for user
            const userQuiz = {
                quiz_id: quiz.quiz_id,
                title: quiz.title,
                description: quiz.description,
                category: quiz.category,
                difficulty: quiz.difficulty,
                time_limit_sec: quiz.time_limit_sec,
                total_questions: quiz.questions.length,
                questions: quiz.questions.map((q) => ({
                    question_id: q.question_id,
                    type: q.type,
                    question_text: q.question_text,
                    image: q.image || null,
                    options: q.options
                }))
            };
            
            // Debug: Log quiz data being sent to user
            console.log('Sending quiz to user:', JSON.stringify({
                quiz_id: userQuiz.quiz_id,
                questions: userQuiz.questions.map(q => ({
                    question_id: q.question_id,
                    image: q.image,
                    hasImage: !!q.image
                }))
            }, null, 2));
            
            res.status(200).json(userQuiz);
        } catch (error) {
            res.status(500).json({ 
                success: false,
                message: 'Error starting quiz', 
                error: error.message 
            });
        }
    }

    // User: Submit quiz answers
    async submitQuiz(req, res) {
        try {
            const { quiz_id, user_id, user_name, user_photo, submitted_at, time_taken_sec, responses } = req.body;
            
            // Debug: Log user photo URL
            console.log('📸 Quiz submission received:');
            console.log('   User ID:', user_id);
            console.log('   User Name:', user_name);
            console.log('   User Photo URL:', user_photo);
            
            if (!quiz_id || !user_id || !responses) {
                return res.status(400).json({
                    success: false,
                    message: 'Quiz ID, user ID, and responses are required'
                });
            }
            
            const quiz = await Quiz.findOne({ quiz_id: quiz_id });
            
            if (!quiz) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Quiz not found' 
                });
            }

            // Check if user has already submitted this quiz
            const existingAttempt = await QuizAttempt.findOne({ 
                quiz_id: quiz_id, 
                user_id: user_id 
            });
            
            if (existingAttempt) {
                return res.status(409).json({
                    success: false,
                    message: 'Quiz already submitted',
                    existing_score: {
                        score: existingAttempt.score,
                        percentage: existingAttempt.percentage,
                        submitted_at: existingAttempt.submitted_at
                    }
                });
            }
            
            // Calculate detailed score with per-question results
            let totalScore = 0;
            const questionResults = [];
            
            // Create a map of responses by question_id for easier lookup
            const responseMap = {};
            responses.forEach(response => {
                responseMap[response.question_id] = response.selected_options;
            });
            
            quiz.questions.forEach((question) => {
                const userSelectedOptions = responseMap[question.question_id] || [];
                let isCorrect = false;
                let earnedMarks = 0;
                
                if (question.type === 'single_choice') {
                    // For single choice, check if the single selected option is correct
                    if (userSelectedOptions.length === 1 && 
                        question.correct_answers.includes(userSelectedOptions[0])) {
                        isCorrect = true;
                        earnedMarks = question.marks;
                        totalScore += question.marks;
                    }
                } else if (question.type === 'multiple_choice') {
                    // For multiple choice, check if all selected options match correct answers
                    const correct = question.correct_answers.sort();
                    const userSelected = userSelectedOptions.sort();
                    
                    if (JSON.stringify(correct) === JSON.stringify(userSelected)) {
                        isCorrect = true;
                        earnedMarks = question.marks;
                        totalScore += question.marks;
                    }
                }
                
                questionResults.push({
                    question_id: question.question_id,
                    user_selected_options: userSelectedOptions,
                    correct_answers: question.correct_answers,
                    is_correct: isCorrect,
                    marks_awarded: earnedMarks,
                    max_marks: question.marks,
                    explanation: question.explanation
                });
            });
            
            // Calculate percentage
            const percentage = quiz.total_marks > 0 ? Math.round((totalScore / quiz.total_marks) * 100) : 0;
            
            // Create quiz attempt record
            const quizAttempt = new QuizAttempt({
                quiz_id: quiz.quiz_id,
                quiz_title: quiz.title,
                user_id: user_id,
                user_name: user_id, // Can be enhanced to get actual name
                score: totalScore,
                percentage: percentage,
                total_marks: quiz.total_marks,
                questions_correct: questionResults.filter(q => q.is_correct).length,
                total_questions: quiz.questions.length,
                time_taken_sec: time_taken_sec || 0,
                submitted_at: submitted_at ? new Date(submitted_at) : new Date(),
                responses: questionResults.map(result => ({
                    question_id: result.question_id,
                    selected_options: result.user_selected_options,
                    is_correct: result.is_correct,
                    marks_awarded: result.marks_awarded
                }))
            });
            
            await quizAttempt.save();
            
            // Update leaderboard with best score only
            const existingLeaderboard = await Leaderboard.findOne({ rollNo: user_id });
            
            console.log('📊 Leaderboard update check:');
            console.log('   Existing entry:', existingLeaderboard ? 'Yes' : 'No');
            console.log('   Current score:', totalScore);
            console.log('   Existing score:', existingLeaderboard?.score || 'N/A');
            console.log('   Will update score:', !existingLeaderboard || totalScore > existingLeaderboard.score);
            
            if (!existingLeaderboard || totalScore > existingLeaderboard.score) {
                // Update full entry with new high score
                const updatedEntry = await Leaderboard.findOneAndUpdate(
                    { rollNo: user_id },
                    { 
                        rollNo: user_id, 
                        name: user_name || user_id,
                        photoURL: user_photo || null,
                        score: totalScore,
                        percentage: percentage,
                        totalMarks: quiz.total_marks,
                        questionsCorrect: questionResults.filter(q => q.is_correct).length,
                        totalQuestions: quiz.questions.length,
                        lastQuizId: quiz._id,
                        quizTitle: quiz.title,
                        submissionTime: submitted_at ? new Date(submitted_at) : new Date()
                    },
                    { new: true, upsert: true }
                );
                console.log('✅ Leaderboard updated with new score:');
                console.log('   Name:', updatedEntry.name);
                console.log('   PhotoURL:', updatedEntry.photoURL);
            } else if (existingLeaderboard && user_photo && !existingLeaderboard.photoURL) {
                // Even if score is not higher, update photoURL if it's missing
                await Leaderboard.findOneAndUpdate(
                    { rollNo: user_id },
                    { 
                        photoURL: user_photo,
                        name: user_name || existingLeaderboard.name
                    }
                );
                console.log('✅ Updated photoURL for existing entry (score unchanged)');
            }
            
            res.status(200).json({ 
                success: true,
                message: 'Quiz submitted successfully',
                evaluation: {
                    quiz_id: quiz.quiz_id,
                    user_id: user_id,
                    submitted_at: submitted_at || new Date().toISOString(),
                    time_taken_sec: time_taken_sec || 0,
                    score: {
                        total_marks_earned: totalScore,
                        total_marks_possible: quiz.total_marks,
                        percentage: percentage,
                        questions_correct: questionResults.filter(q => q.is_correct).length,
                        total_questions: quiz.questions.length
                    },
                    question_results: questionResults
                }
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                message: 'Error submitting quiz', 
                error: error.message 
            });
        }
    }

    // Admin: Toggle quiz active status
    async toggleQuizStatus(req, res) {
        try {
            const { id } = req.params;
            const quiz = await Quiz.findById(id);
            
            if (!quiz) {
                return res.status(404).json({ message: 'Quiz not found' });
            }
            
            quiz.isActive = !quiz.isActive;
            await quiz.save();
            
            res.status(200).json({ 
                message: `Quiz ${quiz.isActive ? 'activated' : 'deactivated'} successfully`,
                quiz: { id: quiz._id, code: quiz.code, isActive: quiz.isActive }
            });
        } catch (error) {
            res.status(500).json({ message: 'Error updating quiz status', error: error.message });
        }
    }

    // Admin: Delete quiz
    async deleteQuiz(req, res) {
        try {
            const { id } = req.params;
            const quiz = await Quiz.findById(id);
            
            if (!quiz) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Quiz not found' 
                });
            }
            
            // Delete all related quiz attempts
            await QuizAttempt.deleteMany({ quiz_id: quiz.quiz_id });
            
            // Delete the quiz
            await Quiz.findByIdAndDelete(id);
            
            res.status(200).json({ 
                success: true,
                message: 'Quiz and all related attempts deleted successfully',
                deletedQuiz: {
                    id: quiz._id,
                    quiz_id: quiz.quiz_id,
                    title: quiz.title
                }
            });
        } catch (error) {
            res.status(500).json({ 
                success: false,
                message: 'Error deleting quiz', 
                error: error.message 
            });
        }
    }

    // Admin: Get all quiz attempts
    async getAllAttempts(req, res) {
        try {
            const { quiz_id, user_id, page = 1, limit = 50 } = req.query;
            const skip = (page - 1) * limit;
            
            // Build filter
            const filter = {};
            if (quiz_id) filter.quiz_id = quiz_id;
            if (user_id) filter.user_id = user_id;
            
            console.log('📋 Fetching attempts with filter:', filter);
            
            const attempts = await QuizAttempt.find(filter)
                .sort({ submitted_at: -1 })
                .limit(parseInt(limit))
                .skip(skip);
                
            const totalAttempts = await QuizAttempt.countDocuments(filter);
            
            console.log(`📋 Found ${attempts.length} attempts (total: ${totalAttempts})`);
            
            res.status(200).json({
                success: true,
                attempts: attempts,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalAttempts / limit),
                    totalAttempts: totalAttempts,
                    hasNext: skip + attempts.length < totalAttempts,
                    hasPrev: page > 1
                }
            });
        } catch (error) {
            console.error('❌ Error fetching attempts:', error);
            res.status(500).json({ 
                success: false,
                message: 'Error fetching quiz attempts', 
                error: error.message 
            });
        }
    }

    // Admin: Get user's quiz history
    async getUserHistory(req, res) {
        try {
            const { user_id } = req.params;
            
            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }
            
            const attempts = await QuizAttempt.find({ user_id: user_id })
                .sort({ submitted_at: -1 });
                
            const summary = {
                total_attempts: attempts.length,
                total_score: attempts.reduce((sum, attempt) => sum + attempt.score, 0),
                average_percentage: attempts.length > 0 ? 
                    Math.round(attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / attempts.length) : 0,
                best_score: attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : 0,
                quizzes_taken: [...new Set(attempts.map(a => a.quiz_title))]
            };
            
            res.status(200).json({
                success: true,
                user_id: user_id,
                summary: summary,
                attempts: attempts
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching user history',
                error: error.message
            });
        }
    }

    // Admin: Delete all quiz attempts
    async deleteAllAttempts(req, res) {
        try {
            const { quiz_id } = req.query;
            
            let filter = {};
            if (quiz_id) {
                filter.quiz_id = quiz_id;
            }
            
            const result = await QuizAttempt.deleteMany(filter);
            
            res.status(200).json({
                success: true,
                message: `Deleted ${result.deletedCount} quiz attempts`,
                deletedCount: result.deletedCount
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting quiz attempts',
                error: error.message
            });
        }
    }

    // Check if user is quiz admin
    async checkIsQuizAdmin(req, res) {
        try {
            const { quizCode, identifier } = req.params;
            
            const quiz = await Quiz.findOne({ code: quizCode });
            
            if (!quiz) {
                return res.status(404).json({
                    success: false,
                    message: 'Quiz not found',
                    isAdmin: false
                });
            }
            
            // Check if the identifier matches the quiz creator or is in admin list
            const isAdmin = quiz.created_by === identifier || 
                           (quiz.admins && quiz.admins.includes(identifier));
            
            res.status(200).json({
                success: true,
                isAdmin: isAdmin,
                quizTitle: quiz.title,
                quizId: quiz._id
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error checking admin status',
                error: error.message,
                isAdmin: false
            });
        }
    }
}

export default new QuizController();
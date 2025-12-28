import express from 'express';
import quizController from '../controllers/quizController.js';
import { getSession, getAllActiveSessions } from '../socket/sessionManager.js';
import { hybridAuthMiddleware, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Admin routes (protected)
router.post('/create', hybridAuthMiddleware, isAdmin, quizController.createQuiz);
router.get('/admin/all', hybridAuthMiddleware, isAdmin, quizController.getAllQuizzes);
router.get('/admin/attempts', hybridAuthMiddleware, isAdmin, quizController.getAllAttempts);
router.delete('/admin/attempts', hybridAuthMiddleware, isAdmin, quizController.deleteAllAttempts);
router.get('/admin/user/:user_id/history', quizController.getUserHistory);
router.patch('/:id/toggle', quizController.toggleQuizStatus);
router.delete('/:id', quizController.deleteQuiz);

// Validate quiz code route
router.get('/validate/:code', quizController.validateQuizCode);

// Session routes (REST endpoints for session status)
router.get('/session/:sessionCode/status', (req, res) => {
    const { sessionCode } = req.params;
    const session = getSession(sessionCode);
    
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
            sessionCode
        });
    }
    
    res.json({
        success: true,
        session: {
            sessionCode: session.sessionCode,
            quizTitle: session.quizTitle,
            status: session.status,
            participantCount: session.participants.size,
            currentQuestionIndex: session.currentQuestionIndex,
            totalQuestions: session.questions.length,
            createdAt: session.createdAt
        }
    });
});

router.get('/session/:sessionCode/state', (req, res) => {
    const { sessionCode } = req.params;
    const session = getSession(sessionCode);
    
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found',
            sessionCode
        });
    }
    
    const participants = [];
    session.participants.forEach((p, id) => {
        participants.push({
            oderId: id,
            userName: p.userName,
            score: p.score,
            correctAnswers: p.correctAnswers,
            isConnected: p.isConnected
        });
    });
    
    res.json({
        success: true,
        session: {
            sessionCode: session.sessionCode,
            quizTitle: session.quizTitle,
            status: session.status,
            currentQuestionIndex: session.currentQuestionIndex,
            totalQuestions: session.questions.length,
            participants: participants.sort((a, b) => b.score - a.score),
            createdAt: session.createdAt
        }
    });
});

router.get('/admin/sessions', (req, res) => {
    const sessions = getAllActiveSessions();
    res.json({
        success: true,
        sessions
    });
});

// User routes
router.post('/start', quizController.startQuiz);
router.post('/submit', quizController.submitQuiz);

// Check admin route
router.get('/check-admin/:quizCode/:identifier', quizController.checkIsQuizAdmin);

export default router;
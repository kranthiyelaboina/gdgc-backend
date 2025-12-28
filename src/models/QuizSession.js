import mongoose from 'mongoose';

const quizSessionSchema = new mongoose.Schema({
    sessionCode: {
        type: String,
        required: true,
        unique: true,
        length: 6,
        uppercase: true
    },
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    adminId: {
        type: String, 
        required: true
    },
    hostAdminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: false 
    },
    status: {
        type: String,
        enum: ['lobby', 'in-progress', 'paused', 'completed', 'interrupted'],
        default: 'lobby'
    },
    currentQuestionIndex: {
        type: Number,
        default: -1 
    },
    questionStartedAt: {
        type: Date,
        default: null
    },
    timePerQuestion: {
        type: Number,
        required: true,
        default: 30 
    },
    allowLateJoin: {
        type: Boolean,
        default: false
    },
    showLeaderboardAfterEach: {
        type: Boolean,
        default: true
    },
    pausedAt: {
        type: Date,
        default: null
    },
    remainingTimeWhenPaused: {
        type: Number,
        default: null
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    completedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

quizSessionSchema.index({ sessionCode: 1 }, { unique: true });
quizSessionSchema.index({ adminId: 1 });
quizSessionSchema.index({ status: 1 });
quizSessionSchema.index({ quizId: 1 });
quizSessionSchema.index({ createdAt: -1 });

const QuizSession = mongoose.model('QuizSession', quizSessionSchema);
export default QuizSession;

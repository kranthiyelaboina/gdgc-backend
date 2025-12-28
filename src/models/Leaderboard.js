import mongoose from 'mongoose';

const leaderboardSchema = new mongoose.Schema({
    rollNo: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    photoURL: {
        type: String,
        default: null
    },
    score: {
        type: Number,
        default: 0
    },
    percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    totalMarks: {
        type: Number,
        default: 0
    },
    questionsCorrect: {
        type: Number,
        default: 0
    },
    totalQuestions: {
        type: Number,
        default: 0
    },
    lastQuizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz'
    },
    quizTitle: {
        type: String
    },
    submissionTime: {
        type: Date
    }
}, {
    timestamps: true
});

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);
export default Leaderboard;
import mongoose from 'mongoose';

const sessionAnswerSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuizSession',
        required: true
    },
    sessionCode: {
        type: String,
        required: true
    },
    oderId: { 
        type: String,
        required: true
    },
    questionIndex: {
        type: Number,
        required: true
    },
    questionId: {
        type: String,
        required: true
    },
    selectedOption: {
        type: String, 
        required: true
    },
    isCorrect: {
        type: Boolean,
        required: true
    },
    answeredAt: {
        type: Date,
        default: Date.now
    },
    responseTimeMs: {
        type: Number, 
        required: true
    },
    pointsAwarded: {
        type: Number,
        default: 0
    },
    speedBonus: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

sessionAnswerSchema.index({ sessionId: 1, questionIndex: 1 });
sessionAnswerSchema.index({ sessionId: 1, oderId: 1 });
sessionAnswerSchema.index({ sessionCode: 1, questionIndex: 1 });

const SessionAnswer = mongoose.model('SessionAnswer', sessionAnswerSchema);
export default SessionAnswer;

import mongoose from 'mongoose';

const sessionParticipantSchema = new mongoose.Schema({
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
    userName: {
        type: String,
        required: true
    },
    userPhoto: {
        type: String,
        default: null
    },
    socketId: {
        type: String,
        default: null
    },
    score: {
        type: Number,
        default: 0
    },
    correctAnswers: {
        type: Number,
        default: 0
    },
    totalAnswered: {
        type: Number,
        default: 0
    },
    isConnected: {
        type: Boolean,
        default: true
    },
    hasAnsweredCurrent: {
        type: Boolean,
        default: false
    },
    lastDisconnectedAt: {
        type: Date,
        default: null
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

sessionParticipantSchema.index({ sessionId: 1, oderId: 1 }, { unique: true });
sessionParticipantSchema.index({ sessionId: 1 });
sessionParticipantSchema.index({ sessionCode: 1 });
sessionParticipantSchema.index({ socketId: 1 });

const SessionParticipant = mongoose.model('SessionParticipant', sessionParticipantSchema);
export default SessionParticipant;

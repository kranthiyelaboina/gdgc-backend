import mongoose from 'mongoose';

const studyJamParticipantSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        trim: true
    },
    userEmail: {
        type: String,
        required: true,
        unique: true, 
        lowercase: true,
        trim: true,
        match: [/.+\@.+\..+/, 'Please fill a valid email address']
    },
    skillsBoostProfileURL: {
        type: String,
        trim: true
    },
    skillBadgesCompleted: {
        type: Number,
        default: 0
    },
    arcadeGamesCompleted: {
        type: Number,
        default: 0
    },
    team: {
        type: String,
        trim: true
    },
    isLead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true 
});

studyJamParticipantSchema.index({ userEmail: 1 });

const StudyJamParticipant = mongoose.model('StudyJamParticipant', studyJamParticipantSchema);

export default StudyJamParticipant;

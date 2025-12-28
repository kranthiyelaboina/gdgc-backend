import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: String, // Store as string in YYYY-MM-DD format
        required: true
    },
    eventType: {
        type: String,
        required: true,
        enum: ['workshop', 'hackathon', 'meetup', 'conference', 'seminar', 'webinar']
    },
    status: {
        type: String,
        enum: ['past', 'upcoming', 'ongoing'],
        default: 'upcoming'
    },
    imageUrl: {
        type: String,
        required: false,
        default: 'default'
    },
    referenceUrl: {
        type: String,
        required: false // Optional field
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});

const Event = mongoose.model('Event', eventSchema);
export default Event;
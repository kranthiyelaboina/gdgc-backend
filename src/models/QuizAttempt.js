import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema({
    quiz_id: {
        type: String,
        required: true
    },
    quiz_title: {
        type: String,
        required: true
    },
    user_id: {
        type: String,
        required: true
    },
    user_name: {
        type: String,
        required: true
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
    total_marks: {
        type: Number,
        required: true
    },
    questions_correct: {
        type: Number,
        default: 0
    },
    total_questions: {
        type: Number,
        required: true
    },
    time_taken_sec: {
        type: Number,
        required: true
    },
    submitted_at: {
        type: Date,
        required: true
    },
    responses: [{
        question_id: {
            type: String,
            required: true
        },
        selected_options: [{
            type: String
        }],
        is_correct: {
            type: Boolean,
            default: false
        },
        marks_awarded: {
            type: Number,
            default: 0
        }
    }]
}, {
    timestamps: true
});

// Compound index to prevent duplicate attempts
quizAttemptSchema.index({ quiz_id: 1, user_id: 1 }, { unique: true });

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
export default QuizAttempt;
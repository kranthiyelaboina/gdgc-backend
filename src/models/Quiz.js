import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
    option_id: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    }
}, { _id: false });

const questionSchema = new mongoose.Schema({
    question_id: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['single_choice', 'multiple_choice'],
        required: true
    },
    question_text: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: false,
        default: null
    },
    options: [optionSchema],
    correct_answers: [{
        type: String,
        required: true
    }],
    marks: {
        type: Number,
        required: true,
        default: 1
    },
    explanation: {
        type: String,
        required: false
    }
}, { _id: false });

const quizSchema = new mongoose.Schema({
    quiz_id: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        required: true
    },
    tags: [{
        type: String
    }],
    time_limit_sec: {
        type: Number,
        required: true
    },
    total_marks: {
        type: Number,
        required: true
    },
    created_by: {
        type: String,
        required: true
    },
    questions: [questionSchema],
    // Additional fields for quiz management
    code: {
        type: String,
        unique: true,
        length: 6
    },
    isActive: {
        type: Boolean,
        default: false
    },
    startTime: {
        type: Date,
        required: false
    },
    endTime: {
        type: Date,
        required: false
    }
}, {
    timestamps: true
});

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
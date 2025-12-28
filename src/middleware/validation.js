import { body, validationResult } from 'express-validator';

const validateAdminRegistration = [
    body('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('secretKey')
        .notEmpty()
        .withMessage('Secret key is required for admin registration')
];

const validateAdminLogin = [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
];

const validatePasswordChange = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

const validateQuiz = [
    body('title').notEmpty().withMessage('Title is required'),
    body('questions').isArray().withMessage('Questions must be an array'),
    body('questions.*.question').notEmpty().withMessage('Question text is required'),
    body('questions.*.options').isArray().withMessage('Options must be an array'),
    body('questions.*.correctAnswer').notEmpty().withMessage('Correct answer is required'),
];

const validateContact = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').notEmpty().withMessage('Message is required'),
];

const validateTeam = [
    body('name').notEmpty().withMessage('Team name is required'),
    body('members').isArray().withMessage('Members must be an array'),
];

const validateBlog = [
    body('title').notEmpty().withMessage('Title is required'),
    body('content').notEmpty().withMessage('Content is required'),
];

const validateCalendarEvent = [
    body('title').notEmpty().withMessage('Event title is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
];

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

export {
    validateAdminLogin, validateAdminRegistration, validatePasswordChange, validateQuiz,
    validateRequest
};


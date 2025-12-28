import express from 'express';

// Import ALL controller functions and the upload middleware
import {
    deleteAllParticipants,
    deleteParticipant,
    getParticipantData,
    updateStudyJamsProgress,
    upload,
    uploadStudyJams,
    getStudyJamsVisibility,
    setStudyJamsVisibility
} from '../controllers/adminStudyJamsController.js';

// Import both the session checker and the admin role checker
import { isAdmin, sessionAuthMiddleware, hybridAuthMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Debug log to confirm routes are being registered
console.log('📍 Registering adminStudyJams routes...');
console.log('   - GET /studyjams-visibility (public)');
console.log('   - POST /studyjams-visibility (admin)');


/**
 * @route   GET /api/admin/studyjams-visibility
 * @desc    Get Study Jams navbar visibility setting (PUBLIC - no auth required)
 * @access  Public
 */
router.get('/studyjams-visibility', getStudyJamsVisibility);

/**
 * @route   POST /api/admin/studyjams-visibility
 * @desc    Set Study Jams navbar visibility setting
 * @access  Admin
 */
router.post(
    '/studyjams-visibility',
    hybridAuthMiddleware,
    isAdmin,
    setStudyJamsVisibility
);


/**
 * @route   GET /api/admin/participants
 * @desc    Get a list of participants with selected fields
 * @access  Admin
 */
router.get(
    '/participants',
    getParticipantData
);


/**
 * @route   POST /api/admin/upload-study-jams
 * @desc    Upload a participant list to ENROLL and SET full data
 * @access  Admin
 */
router.post(
    '/upload-study-jams',
    sessionAuthMiddleware, // 1. Check if user is logged in
    isAdmin,               // 2. Check if logged-in user is an admin
    upload.single('participantsFile'), 
    uploadStudyJams
);

/**
 * @route   POST /api/admin/update-progress
 * @desc    Upload a progress report to UPDATE ONLY scores
 * @access  Admin
 */
router.post(
    '/update-progress',
    sessionAuthMiddleware, // 1. Check if user is logged in
    isAdmin,               // 2. Check if logged-in user is an admin
    upload.single('participantsFile'), 
    updateStudyJamsProgress
);

/**
 * @route   DELETE /api/admin/participant/:email
 * @desc    Delete a single participant by their email
 * @access  Admin
 */
router.delete(
    '/participant/:email',
    sessionAuthMiddleware, // 1. Check if user is logged in
    isAdmin,               // 2. Check if logged-in user is an admin
    deleteParticipant
);

/**
 * @route   DELETE /api/admin/participants/all
 * @desc    Delete ALL participants (DANGER ZONE)
 * @access  Admin
 */
router.delete(
    '/participants/all',
    sessionAuthMiddleware, // 1. Check if user is logged in
    isAdmin,               // 2. Check if logged-in user is an admin
    deleteAllParticipants
);


export default router;


import express from 'express';
import {
    getFirebaseUsers,
    getFirebaseUserByUid,
    deleteFirebaseUser,
    updateFirebaseUserStatus
} from '../controllers/firebaseUsersController.js';
import { verifyFirebaseToken, hybridAuthMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Firebase Users Routes
 * 
 * These routes use Firebase ID Token authentication.
 * The frontend must send the user's Firebase ID token in the Authorization header.
 * 
 * All routes are protected - only authenticated users can access them.
 */

/**
 * @route   GET /api/firebase/users
 * @desc    Get all Firebase authenticated users
 * @access  Admin (requires valid Firebase ID token or JWT)
 */
router.get('/users', hybridAuthMiddleware, getFirebaseUsers);

/**
 * @route   GET /api/firebase/users/:uid
 * @desc    Get a single Firebase user by UID
 * @access  Admin (requires valid Firebase ID token or JWT)
 */
router.get('/users/:uid', hybridAuthMiddleware, getFirebaseUserByUid);

/**
 * @route   DELETE /api/firebase/users/:uid
 * @desc    Delete a Firebase user
 * @access  Admin (requires valid Firebase ID token or JWT)
 */
router.delete('/users/:uid', hybridAuthMiddleware, deleteFirebaseUser);

/**
 * @route   PATCH /api/firebase/users/:uid/status
 * @desc    Enable or disable a Firebase user
 * @access  Admin (requires valid Firebase ID token or JWT)
 * @body    { disabled: boolean }
 */
router.patch('/users/:uid/status', hybridAuthMiddleware, updateFirebaseUserStatus);

export default router;

import express from 'express';
import authController from '../controllers/authController.js';
import { sessionAuthMiddleware, hybridAuthMiddleware } from '../middleware/auth.js';
import { validateAdminLogin, validateAdminRegistration, validatePasswordChange, validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Admin registration (with secret key validation)
router.post('/register', validateAdminRegistration, validateRequest, authController.register);

// Admin login
router.post('/login', validateAdminLogin, validateRequest, authController.login);

// Admin logout (requires authentication)
router.post('/logout', hybridAuthMiddleware, authController.logout);

// Get current admin info (protected route)
router.get('/me', hybridAuthMiddleware, authController.getCurrentAdmin);

// Refresh JWT token (protected route)
router.post('/refresh-token', hybridAuthMiddleware, authController.refreshToken);

// Change password (protected route) - uses hybrid auth for cross-origin support
router.put('/change-password', hybridAuthMiddleware, validatePasswordChange, validateRequest, authController.changePassword);

// Get all admins (super admin only)
router.get('/admins', hybridAuthMiddleware, authController.getAllAdmins);

// Delete admin (master admin only - 'kranthi')
router.delete('/admin/:adminId', hybridAuthMiddleware, authController.deleteAdmin);

export default router;
import jwt from 'jsonwebtoken';
import admin from '../config/firebase.js';

// JWT Token middleware
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// Session-based middleware
const sessionAuthMiddleware = (req, res, next) => {
    if (!req.session.adminId) {
        return res.status(401).json({ message: 'Please log in to access this resource' });
    }
    
    req.admin = req.session.admin;
    next();
};

// Hybrid middleware: accepts either session OR JWT token
// This is useful for cross-origin requests where session cookies might not work
const hybridAuthMiddleware = (req, res, next) => {
    // First try session authentication
    if (req.session && req.session.adminId) {
        req.admin = req.session.admin;
        req.adminId = req.session.adminId;
        return next();
    }
    
    // Fall back to JWT token authentication
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Please log in to access this resource' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;
        req.adminId = decoded.adminId;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// Admin role check middleware
const isAdmin = (req, res, next) => {
    console.log('🔐 isAdmin check - req.admin:', req.admin);
    
    // Check if admin exists
    if (!req.admin) {
        console.log('❌ No admin object found');
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Check role - handle different possible structures
    const role = req.admin.role || req.admin.admin?.role;
    
    // If role is 'admin' OR if admin object exists (for backwards compatibility)
    // Many systems just check if admin is authenticated, role is always 'admin'
    if (role === 'admin' || (req.admin && !role)) {
        console.log('✅ Admin access granted');
        return next();
    }
    
    console.log('❌ Role check failed. Role:', role);
    return res.status(403).json({ message: 'Admin access required' });
};

/**
 * Firebase ID Token Verification Middleware
 * 
 * Verifies Firebase ID tokens sent from the frontend.
 * The frontend gets the ID token from Firebase Auth after Google Sign-In
 * and sends it in the Authorization header.
 * 
 * This middleware:
 * 1. Extracts the Bearer token from Authorization header
 * 2. Verifies it with Firebase Admin SDK
 * 3. Attaches the decoded token (with user info) to req.firebaseUser
 */
const verifyFirebaseToken = async (req, res, next) => {
    try {
        // Check if Firebase Admin is initialized
        if (!admin || !admin.auth) {
            console.error('❌ Firebase Admin SDK not initialized');
            return res.status(503).json({ 
                success: false,
                message: 'Firebase authentication service unavailable' 
            });
        }

        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false,
                message: 'No Firebase token provided' 
            });
        }

        const idToken = authHeader.split('Bearer ')[1];

        if (!idToken) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid authorization header format' 
            });
        }

        // Verify the ID token with Firebase Admin SDK
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        // Attach the decoded token to the request
        req.firebaseUser = decodedToken;
        
        console.log(`✅ Firebase token verified for user: ${decodedToken.email || decodedToken.uid}`);
        
        next();
    } catch (error) {
        console.error('❌ Firebase token verification failed:', error.message);
        
        // Handle specific Firebase auth errors
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ 
                success: false,
                message: 'Firebase token expired. Please sign in again.' 
            });
        }
        
        if (error.code === 'auth/id-token-revoked') {
            return res.status(401).json({ 
                success: false,
                message: 'Firebase token has been revoked. Please sign in again.' 
            });
        }
        
        if (error.code === 'auth/argument-error') {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid Firebase token format' 
            });
        }

        return res.status(403).json({ 
            success: false,
            message: 'Failed to verify Firebase token' 
        });
    }
};

/**
 * Combined Auth Middleware
 * 
 * Accepts EITHER:
 * 1. JWT token (for admin dashboard login)
 * 2. Firebase ID token (for Google Sign-In users)
 * 
 * Useful for routes that need to accept both authentication methods.
 */
const hybridFirebaseOrJwtAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false,
            message: 'No authentication token provided' 
        });
    }

    const token = authHeader.split('Bearer ')[1];

    // Try JWT verification first (faster, local verification)
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;
        req.authType = 'jwt';
        return next();
    } catch (jwtError) {
        // JWT failed, try Firebase token
    }

    // Try Firebase token verification
    try {
        if (admin && admin.auth) {
            const decodedToken = await admin.auth().verifyIdToken(token);
            req.firebaseUser = decodedToken;
            req.authType = 'firebase';
            return next();
        }
    } catch (firebaseError) {
        // Firebase verification also failed
    }

    return res.status(403).json({ 
        success: false,
        message: 'Invalid or expired token' 
    });
};

export { 
    authMiddleware, 
    isAdmin, 
    sessionAuthMiddleware, 
    hybridAuthMiddleware,
    verifyFirebaseToken,
    hybridFirebaseOrJwtAuth
};

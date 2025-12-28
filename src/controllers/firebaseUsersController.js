import admin from '../config/firebase.js';

/**
 * Firebase Users Controller
 * 
 * Handles all Firebase Authentication user management operations
 * using the Firebase Admin SDK.
 */

/**
 * Get all Firebase users
 * Lists all users from Firebase Authentication
 * 
 * @route GET /api/firebase/users
 * @access Admin (requires valid Firebase ID token)
 */
export const getFirebaseUsers = async (req, res) => {
  try {
    // Check if Firebase Admin is initialized
    if (!admin || !admin.auth) {
      return res.status(503).json({
        success: false,
        message: 'Firebase Admin SDK not initialized. Please check server configuration.'
      });
    }

    // List users from Firebase Auth (max 1000 at a time)
    const listUsersResult = await admin.auth().listUsers(1000);

    // Map user records to a cleaner format
    const users = listUsersResult.users.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email || null,
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
      emailVerified: userRecord.emailVerified,
      disabled: userRecord.disabled,
      lastSignInTime: userRecord.metadata.lastSignInTime || null,
      creationTime: userRecord.metadata.creationTime || null,
      providerData: userRecord.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email
      }))
    }));

    console.log(`✅ Fetched ${users.length} Firebase users`);

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error('❌ Error fetching Firebase users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a single Firebase user by UID
 * 
 * @route GET /api/firebase/users/:uid
 * @access Admin (requires valid Firebase ID token)
 */
export const getFirebaseUserByUid = async (req, res) => {
  try {
    const { uid } = req.params;

    if (!admin || !admin.auth) {
      return res.status(503).json({
        success: false,
        message: 'Firebase Admin SDK not initialized'
      });
    }

    const userRecord = await admin.auth().getUser(uid);

    const user = {
      uid: userRecord.uid,
      email: userRecord.email || null,
      displayName: userRecord.displayName || null,
      photoURL: userRecord.photoURL || null,
      emailVerified: userRecord.emailVerified,
      disabled: userRecord.disabled,
      lastSignInTime: userRecord.metadata.lastSignInTime || null,
      creationTime: userRecord.metadata.creationTime || null,
      providerData: userRecord.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email
      }))
    };

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    console.error('❌ Error fetching Firebase user:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a Firebase user by UID
 * 
 * @route DELETE /api/firebase/users/:uid
 * @access Admin (requires valid Firebase ID token)
 */
export const deleteFirebaseUser = async (req, res) => {
  try {
    const { uid } = req.params;

    if (!admin || !admin.auth) {
      return res.status(503).json({
        success: false,
        message: 'Firebase Admin SDK not initialized'
      });
    }

    await admin.auth().deleteUser(uid);

    console.log(`✅ Deleted Firebase user: ${uid}`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting Firebase user:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Disable/Enable a Firebase user
 * 
 * @route PATCH /api/firebase/users/:uid/status
 * @access Admin (requires valid Firebase ID token)
 */
export const updateFirebaseUserStatus = async (req, res) => {
  try {
    const { uid } = req.params;
    const { disabled } = req.body;

    if (!admin || !admin.auth) {
      return res.status(503).json({
        success: false,
        message: 'Firebase Admin SDK not initialized'
      });
    }

    if (typeof disabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'disabled field must be a boolean'
      });
    }

    // Update user status
    await admin.auth().updateUser(uid, { disabled });

    // If blocking the user, revoke their refresh tokens to force re-authentication
    if (disabled) {
      await admin.auth().revokeRefreshTokens(uid);
      console.log(`✅ Revoked refresh tokens for user ${uid}`);
    }

    console.log(`✅ Updated Firebase user ${uid} status: disabled=${disabled}`);

    res.status(200).json({
      success: true,
      message: `User ${disabled ? 'disabled' : 'enabled'} successfully`
    });

  } catch (error) {
    console.error('❌ Error updating Firebase user status:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

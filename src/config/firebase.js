import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

/**
 * Firebase Admin SDK Configuration
 * 
 * The service account credentials can be loaded from:
 * 1. FIREBASE_SERVICE_ACCOUNT environment variable (JSON string)
 * 2. A local file: firebase-service-account.json in the root directory
 * 
 * For production (Render.com), use the environment variable.
 * For local development, you can use either method.
 */

let firebaseAdmin = null;

const initializeFirebase = () => {
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  try {
    let serviceAccount = null;

    // Method 1: Try environment variable first
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('✅ Firebase credentials loaded from environment variable');
      } catch (parseError) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', parseError.message);
      }
    }

    // Method 2: Try loading from local file if env var didn't work
    if (!serviceAccount) {
      const localFilePath = path.join(process.cwd(), 'firebase-service-account.json');
      if (fs.existsSync(localFilePath)) {
        try {
          const fileContent = fs.readFileSync(localFilePath, 'utf8');
          serviceAccount = JSON.parse(fileContent);
          console.log('✅ Firebase credentials loaded from local file');
        } catch (fileError) {
          console.error('❌ Failed to read firebase-service-account.json:', fileError.message);
        }
      }
    }

    // If no credentials found, disable Firebase features
    if (!serviceAccount) {
      console.warn('⚠️ No Firebase credentials found');
      console.warn('⚠️ Firebase Admin features will be disabled');
      console.warn('💡 To enable: Set FIREBASE_SERVICE_ACCOUNT env var OR create firebase-service-account.json');
      return null;
    }

    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    firebaseAdmin = admin;
    console.log('✅ Firebase Admin SDK initialized successfully');
    return firebaseAdmin;

  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    return null;
  }
};

// Initialize on module load
initializeFirebase();

export { admin, initializeFirebase };
export default admin;

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// IMPORTANT: Initialize Firebase Admin SDK.
// Replace './your-project-id-firebase-adminsdk-xxxxx-xxxxxx.json' with the actual relative path
// to your downloaded JSON key. For local testing/emulation, place the downloaded JSON file
// directly in the 'functions' directory (or 'functions/src' if that's where you prefer).
// For deployment, Firebase Functions automatically handles authentication using the default
// service account, but explicitly initializing is good practice.
// Make sure to NEVER expose this file publicly or commit it to a public repository!

// Conditional initialization for local emulation vs. deployed environment
try {
  if (!admin.apps.length) { // Check if Firebase Admin SDK is already initialized
    // Determine if running in a local emulator or a non-production environment
    if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV !== 'production') {
      // Use service account key file for local development/emulation
      // Make sure this path is correct relative to where your 'index.ts' compiles from.
      // Often, if 'index.ts' is in 'src/', the key file is in the root 'functions/' directory.
      // Adjust path as needed, e.g., '../your-project-id-firebase-adminsdk-xxxxx-xxxxxx.json'
      const serviceAccount = require('../wedding-website-marta-jonathan-firebase-admin.json'); // <<<<< UPDATE THIS PATH AND FILENAME
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized locally using service account key.');
    } else {
      // For deployment to Firebase Cloud Functions, initialize without arguments
      // Google Cloud handles authentication automatically for deployed functions
      admin.initializeApp();
      console.log('Firebase Admin SDK initialized for deployed function.');
    }
  }
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
}

/**
 * Cloud Function to create a custom Firebase Authentication token.
 * This function will be called by your Angular frontend using `functions.https.CallableFunction`.
 *
 * It expects data to contain a 'qrCodeToken' field.
 *
 * @param data The data payload from the client, expected to contain `qrCodeToken`.
 * @param context The context of the function call, including authentication info.
 * @returns An object containing the custom authentication token.
 * @throws HttpsError on invalid argument or internal errors.
 */
exports.generateCustomToken = functions.https.onCall(async (data: any, context: any) => {
  // Ensure the request includes a 'qrCodeToken' field.
  if (!data.qrCodeToken) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with one argument "qrCodeToken".'
    );
  }

  const qrCodeToken: string = data.qrCodeToken; // This would be the unique token from your QR code

  // --- START: Placeholder for actual QR code token validation ---
  // In a real scenario, you would validate this qrCodeToken against
  // a list of valid, unused tokens stored in Firestore.
  // For now, we'll just use it directly as the UID for demonstration.
  // This is where your QR code logic would go:
  // 1. Query Firestore: Look up 'qrCodeToken' in a 'guestTokens' collection.
  // 2. Validate: Check if token exists and is valid/unused.
  // 3. Retrieve User Info: Get associated user details (e.g., name, attendance status).
  // 4. Determine UID: Use a stable unique ID for the guest.
  // 5. Update Token Status: Mark token as used in Firestore.
  // --- END: Placeholder ---

  // For demonstration, we'll use the qrCodeToken directly as the Firebase UID.
  // In a real app, you might map qrCodeToken to a different, stable UID
  // fetched from Firestore based on the qrCodeToken.
  const uid: string = qrCodeToken; // Using QR code token as UID for simplicity

  try {
    // Create the custom token. Optionally, add custom claims here
    // to include user-specific data (e.g., guest name, RSVP status)
    // that can be accessed in Firebase Security Rules.
    const customToken: string = await admin.auth().createCustomToken(uid, {
      qrToken: qrCodeToken, // Store the original QR token as a claim
      // Example: guestName: 'Sarah & David',
      //          rsvpStatus: 'pending'
    });

    console.log(`Custom token created for UID: ${uid}`);
    return { token: customToken }; // Return the custom token to the client
  } catch (error: any) { // Use 'any' for error type to handle various error structures
    console.error('Error creating custom token:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Unable to create custom authentication token.',
      error.message // Optionally pass original error message for debugging
    );
  }
});

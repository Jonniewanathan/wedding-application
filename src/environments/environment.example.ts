export const environment = {
  production: false,
  // Public site URL used when generating shareable invitation links
  // (QR codes, WhatsApp message). Should be the address guests will
  // actually visit, not your local dev origin.
  siteBaseUrl: "https://example.com",
  firebaseConfig: {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.firebasestorage.app",
    messagingSenderId: "000000000000",
    appId: "1:000000000000:web:0000000000000000000000"
  }
};
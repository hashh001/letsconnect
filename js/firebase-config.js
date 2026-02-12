// Firebase Configuration and Initialization
// Import Firebase SDKs from CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js';

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAepamFslGSlt393EcCBFt8Nlf6RNGFFyU",
    authDomain: "ecaconnect-7c652.firebaseapp.com",
    projectId: "ecaconnect-7c652",
    storageBucket: "ecaconnect-7c652.firebasestorage.app",
    messagingSenderId: "350772939210",
    appId: "1:350772939210:web:1f4bfa95d22c1097abe733",
    measurementId: "G-21PNCQX039"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Provider
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

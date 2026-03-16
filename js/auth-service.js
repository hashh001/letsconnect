// Authentication Service for ECA-Connect
import { auth, googleProvider, db } from './firebase-config.js';
import { profileService } from './profile-service.js';
import { firestoreService } from './firestore-service.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    verifyPasswordResetCode,
    confirmPasswordReset
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

class AuthService {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.authStateListeners = [];
        this.initAuthListener();
    }

    initAuthListener() {
        onAuthStateChanged(auth, async (user) => {
            this.currentUser = user;
            if (user) {
                console.log('✅ User authenticated:', user.email);
                await this.loadUserProfile(user.uid);
                this.authStateListeners.forEach(callback => callback(user, this.userProfile));
            } else {
                console.log('❌ User not authenticated');
                this.userProfile = null;
                localStorage.removeItem('userProfile');
                this.authStateListeners.forEach(callback => callback(null, null));
            }
        });
    }

    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
        if (this.currentUser) {
            callback(this.currentUser, this.userProfile);
        }
        return () => {
            const index = this.authStateListeners.indexOf(callback);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
            }
        };
    }

    // Email/Password Signup
    async signupWithEmail(email, password, displayName) {
        try {
            console.log('📝 Creating account for:', email);

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName });

            try {
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    // PRIVACY FIX (#3): email removed from Firestore.
                    // Email is available via Firebase Auth (auth.currentUser.email).
                    // Storing it in Firestore exposes it to any authenticated user
                    // who gains read access to the document.
                    displayName: displayName,
                    photoURL: null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    profileComplete: false,
                    interests: [],
                    availability: [],
                    location: null,
                    preferences: {
                        radius: 10,
                        language: 'English',
                        genderPreference: 'Any'
                    },
                    stats: {
                        joinedGroups: 0,
                        createdGroups: 0,
                        upcomingActivities: 0
                    }
                });
                console.log('✅ User profile created in Firestore');
            } catch (firestoreError) {
                console.warn('⚠️ Firestore profile creation failed (will retry later):', firestoreError.message);
                // Don't fail signup if Firestore is unavailable
                // Profile will be created when user completes profile-setup
            }

            console.log('✅ Account created successfully');
            return { success: true, user };
        } catch (error) {
            console.error('❌ Signup error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    // Email/Password Login
    async loginWithEmail(email, password) {
        try {
            console.log('🔐 Logging in:', email);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('✅ Login successful');
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('❌ Login error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    // Google OAuth Login/Signup
    async loginWithGoogle() {
        try {
            console.log('🔐 Logging in with Google...');

            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));

                if (!userDoc.exists()) {
                    console.log('📝 Creating new user profile for Google user');
                    await setDoc(doc(db, 'users', user.uid), {
                        uid: user.uid,
                        // PRIVACY FIX (#3): email removed from Firestore
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        profileComplete: false,
                        interests: [],
                        availability: [],
                        location: null,
                        preferences: {
                            radius: 10,
                            language: 'English',
                            genderPreference: 'Any'
                        },
                        stats: {
                            joinedGroups: 0,
                            createdGroups: 0,
                            upcomingActivities: 0
                        }
                    });
                    console.log('✅ User profile created in Firestore');
                } else {
                    console.log('✅ Existing user profile found');
                }
            } catch (firestoreError) {
                console.warn('⚠️ Firestore operation failed (will retry later):', firestoreError.message);
            }

            console.log('✅ Google login successful');
            return { success: true, user };
        } catch (error) {
            console.error('❌ Google login error:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                return { success: false, error: 'Login cancelled' };
            }
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    // Send password reset email (Firebase native — secure link)
    async sendPasswordReset(email) {
        try {
            const continueUrl = 'https://ecaconnect-7c652.web.app/pages/reset-password.html';
            await sendPasswordResetEmail(auth, email, { url: continueUrl });
            console.log('📧 Password reset email sent to:', email);
            return { success: true };
        } catch (error) {
            console.error('❌ Password reset error:', error);
            // Don't leak whether email exists — return success regardless
            return { success: false, error: error.message };
        }
    }

    // Verify that an oobCode from the reset email is still valid
    async verifyResetCode(oobCode) {
        try {
            const email = await verifyPasswordResetCode(auth, oobCode);
            return { success: true, email };
        } catch (error) {
            console.error('❌ Invalid/expired reset code:', error);
            return { success: false, error: 'Link is invalid or has expired.' };
        }
    }

    // Apply the new password using Firebase's oobCode
    async confirmPasswordReset(oobCode, newPassword) {
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            // Sign out any existing session so user must log in fresh
            try { await signOut(auth); } catch (_) {}
            console.log('✅ Password reset confirmed');
            return { success: true };
        } catch (error) {
            console.error('❌ Confirm reset error:', error);
            const msg = error.code === 'auth/expired-action-code'
                ? 'This link has expired. Please request a new one.'
                : error.code === 'auth/weak-password'
                ? 'Password is too weak. Use at least 8 characters.'
                : 'Something went wrong. Please try again.';
            return { success: false, error: msg };
        }
    }

    // Logout
    async logout() {
        try {
            console.log('👋 Logging out...');

            // PRIVACY FIX (#15): Clean up all active Firestore listeners before
            // signing out. Without this, onSnapshot listeners stay open after the
            // auth token is invalidated — causing permission errors and potential
            // data leaks if another user logs in on the same device.
            try {
                firestoreService.cleanup();
                console.log('✅ Firestore listeners cleaned up');
            } catch (cleanupError) {
                console.warn('⚠️ Could not clean up Firestore listeners:', cleanupError);
            }

            await signOut(auth);
            localStorage.clear();

            console.log('✅ Logout successful');
            return { success: true };
        } catch (error) {
            console.error('❌ Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    // Load user profile from Firestore
    async loadUserProfile(uid) {
        try {
            // Use profileService for better caching and management
            const profile = await profileService.getUserProfile(uid);

            if (profile) {
                this.userProfile = profile;
                return profile;
            }

            console.warn('⚠️ User profile not found');
            const minimalProfile = { uid: uid, profileComplete: false, setupStep: 0 };
            this.userProfile = minimalProfile;
            return minimalProfile;
        } catch (error) {
            console.error('❌ Error loading profile:', error);
            const minimalProfile = { uid: uid, profileComplete: false, setupStep: 0 };
            this.userProfile = minimalProfile;
            return minimalProfile;
        }
    }

    isAuthenticated() { return this.currentUser !== null; }
    getCurrentUser()  { return this.currentUser; }
    getUserProfile()  { return this.userProfile; }

    async isProfileComplete(uid) {
        const profile = await profileService.getUserProfile(uid || this.currentUser?.uid);
        return profileService.isProfileComplete(profile);
    }

    async getCurrentSetupStep(uid) {
        const profile = await profileService.getUserProfile(uid || this.currentUser?.uid);
        return profileService.getCurrentStep(profile);
    }

    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'This email is already registered. Please login instead.',
            'auth/invalid-email': 'Invalid email address.',
            'auth/operation-not-allowed': 'Operation not allowed. Please contact support.',
            'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
            'auth/user-disabled': 'This account has been disabled.',
            'auth/user-not-found': 'No account found with this email.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/invalid-credential': 'Invalid email or password.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/popup-blocked': 'Popup was blocked. Please allow popups for this site.',
            'auth/popup-closed-by-user': 'Login cancelled.',
            'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.'
        };
        return errorMessages[errorCode] || 'An error occurred. Please try again.';
    }
}

// Create singleton instance
export const authService = new AuthService();

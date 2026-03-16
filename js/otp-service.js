// OTP Verification Service for ECA-Connect
// Generates a 4-digit code, stores it in Firestore, and sends it via EmailJS.

import { db } from './firebase-config.js';
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { emailService } from './email-service.js';

class OTPService {

    /** Generate a random 4-digit string (e.g. "0429") */
    generateOTP() {
        return String(Math.floor(1000 + Math.random() * 9000));
    }

    /**
     * Store OTP in Firestore under otpVerifications/{uid}.
     * Expires in 10 minutes.
     */
    async storeOTP(uid, otp) {
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now
        await setDoc(doc(db, 'otpVerifications', uid), {
            otp,
            expiresAt: expiresAt.toISOString(),
            verified: false,
            createdAt: new Date().toISOString()
        });
        console.log('✅ OTP stored in Firestore for uid:', uid);
    }

    /**
     * Send OTP code to user's email via EmailJS.
     */
    async sendOTPEmail(toEmail, toName, otp) {
        return emailService.sendOTPEmail(toEmail, toName, otp);
    }

    /**
     * Full flow: generate → store → send.
     * Returns { success: true } or { success: false, error }.
     */
    async createAndSendOTP(uid, email, name) {
        try {
            const otp = this.generateOTP();
            await this.storeOTP(uid, otp);
            await this.sendOTPEmail(email, name, otp);
            console.log('📧 OTP created and sent to:', email);
            return { success: true };
        } catch (error) {
            console.error('❌ Failed to create/send OTP:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Verify the code the user typed.
     * Returns { success: true } if correct and not expired.
     * Returns { success: false, error: '...' } otherwise.
     */
    async verifyOTP(uid, enteredCode) {
        try {
            const ref  = doc(db, 'otpVerifications', uid);
            const snap = await getDoc(ref);

            if (!snap.exists()) {
                return { success: false, error: 'No verification code found. Please request a new one.' };
            }

            const data = snap.data();

            // Check expiry
            if (new Date() > new Date(data.expiresAt)) {
                return { success: false, error: 'Code has expired. Please request a new one.' };
            }

            // Check already verified
            if (data.verified) {
                return { success: true }; // already verified, let them through
            }

            // Check code
            if (data.otp !== String(enteredCode).trim()) {
                return { success: false, error: 'Incorrect code. Please try again.' };
            }

            // Mark as verified
            await setDoc(ref, { ...data, verified: true });
            console.log('✅ OTP verified for uid:', uid);
            return { success: true };

        } catch (error) {
            console.error('❌ OTP verification error:', error);
            return { success: false, error: 'Verification failed. Please try again.' };
        }
    }
}

export const otpService = new OTPService();

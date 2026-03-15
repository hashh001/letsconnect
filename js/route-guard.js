// Route Guard - Protects pages that require authentication
import { authService } from './auth-service.js';

// Pages that require authentication
const protectedPages = [
    'dashboard.html',
    'profile.html',
    'profile-setup.html',
    'create-group.html',
    'group-details.html',
    // PRIVACY FIX (VULN-8): Added missing protected pages. Without these,
    // direct URL navigation while logged out briefly renders the page before
    // Firebase's async auth check fires the redirect.
    'my-groups.html',
    'group-manager.html',
    'edit-group.html',
    'public-profile.html'
];

// Pages that should redirect if already authenticated
const authPages = [
    'login.html',
    'signup.html'
];

// Check if current page requires authentication
export function checkAuth() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';



    if (protectedPages.includes(currentPage)) {
        // Wait for auth state to be determined
        return new Promise((resolve) => {
            const unsubscribe = authService.onAuthStateChange((user, profile) => {
                unsubscribe();

                if (!user) {

                    window.location.href = '../pages/login.html';
                    resolve(false);
                } else {

                    resolve(true);
                }
            });
        });
    }

    return Promise.resolve(true);
}

// Redirect if already logged in (for login/signup pages)
export function redirectIfAuthenticated() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (authPages.includes(currentPage)) {
        return new Promise((resolve) => {
            const unsubscribe = authService.onAuthStateChange(async (user, profile) => {
                unsubscribe();

                if (!user) {
                    resolve(false);
                    return;
                }

                // Race condition guard: if user is authenticated but profile hasn't
                // loaded from Firestore yet (e.g. after cookie-clear + re-login),
                // fetch it directly instead of falling through and doing nothing.
                let resolvedProfile = profile;
                if (!resolvedProfile) {
                    try {
                        const { profileService } = await import('./profile-service.js');
                        resolvedProfile = await profileService.getUserProfile(user.uid, false);
                    } catch (e) {
                        console.warn('⚠️ Could not fetch profile for redirect check:', e);
                    }
                }

                if (resolvedProfile) {
                    // Redirect based on profile completion
                    if (resolvedProfile.profileComplete) {
                        window.location.href = 'dashboard.html';
                    } else {
                        const step = resolvedProfile.setupStep || 0;
                        window.location.href = `profile-setup.html${step > 0 ? '?step=' + step : ''}`;
                    }
                    resolve(true);
                } else {
                    // No profile doc at all — send to setup from scratch
                    window.location.href = 'profile-setup.html';
                    resolve(true);
                }
            });
        });
    }

    return Promise.resolve(false);
}

// Check if profile is complete for dashboard access
export async function requireCompleteProfile() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Only check for dashboard
    if (currentPage === 'dashboard.html') {
        return new Promise((resolve) => {
            const unsubscribe = authService.onAuthStateChange((user, profile) => {
                unsubscribe();

                if (user && profile) {
                    if (!profile.profileComplete) {

                        const step = profile.setupStep || 0;
                        window.location.href = `profile-setup.html${step > 0 ? '?step=' + step : ''}`;
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                } else {
                    resolve(false);
                }
            });
        });
    }

    return Promise.resolve(true);
}

// Initialize route guard on page load
document.addEventListener('DOMContentLoaded', async () => {


    await checkAuth();
    await redirectIfAuthenticated();
    await requireCompleteProfile();
});

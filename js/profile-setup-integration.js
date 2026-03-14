// Profile Setup Integration - Connects profile-setup.html to Firestore
import { profileService } from './profile-service.js';
import { storageService } from './storage-service.js';
import { auth } from './firebase-config.js';

// ─── Location Privacy Helpers ─────────────────────────────────────────────────

/**
 * Reduce coordinate precision to ~2 km grid (≈ 2 decimal places ≈ 1.1 km).
 * This means Firestore never stores a pin-point home address.
 * The ranking engine still works well at this resolution.
 *
 * @param {number} coord - Raw lat or lon from browser
 * @returns {number} Rounded to 2 decimal places
 */
function fuzzyCoord(coord) {
    return Math.round(coord * 100) / 100; // ±0.005° ≈ ±550 m
}

/**
 * Build a privacy-safe location object to store in Firestore.
 * Precise coords stay in memory only (for the current session's ranking).
 *
 * @param {number} lat  - Precise latitude from browser
 * @param {number} lon  - Precise longitude from browser
 * @param {string} city - Reverse-geocoded city name
 * @param {string} state - Reverse-geocoded state name
 * @returns {Object} Safe location object
 */
function buildSafeLocation(lat, lon, city, state) {
    return {
        // Fuzzy coords (±~550 m) — safe to store in Firestore
        lat: fuzzyCoord(lat),
        lon: fuzzyCoord(lon),
        // Legacy aliases kept for backward compat
        latitude:  fuzzyCoord(lat),
        longitude: fuzzyCoord(lon),
        // Human-readable label only
        city:  city  || '',
        state: state || ''
    };
}

// ─────────────────────────────────────────────────────────────────────────────

class ProfileSetupIntegration {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the integration.
     * Must be called after DOM is loaded and user is authenticated.
     */
    async init() {
        try {
            this.currentUser = auth.currentUser;

            if (!this.currentUser) {
                console.error('❌ No authenticated user found');
                window.location.href = 'login.html';
                return;
            }

            this.isInitialized = true;

            const urlParams = new URLSearchParams(window.location.search);
            const stepParam = parseInt(urlParams.get('step'));

            if (stepParam && stepParam > 0 && stepParam <= 5) {
                return stepParam;
            }

            return 1;
        } catch (error) {
            console.error('❌ Error initializing profile setup:', error);
            throw error;
        }
    }

    // ── Step 1: Interests ─────────────────────────────────────────────────────

    async saveStep1(interests) {
        try {
            if (!this.isInitialized) throw new Error('Integration not initialized');

            await profileService.updateProfileStep(this.currentUser.uid, 1, {
                interests: interests
            });

            return true;
        } catch (error) {
            console.error('❌ Error saving Step 1:', error);
            alert('Failed to save interests. Please try again.');
            return false;
        }
    }

    // ── Step 2: Availability ──────────────────────────────────────────────────

    async saveStep2(availability) {
        try {
            if (!this.isInitialized) throw new Error('Integration not initialized');

            await profileService.updateProfileStep(this.currentUser.uid, 2, {
                availability: availability
            });

            return true;
        } catch (error) {
            console.error('❌ Error saving Step 2:', error);
            alert('Failed to save availability. Please try again.');
            return false;
        }
    }

    // ── Step 3: Location ──────────────────────────────────────────────────────

    /**
     * Save Step 3 - Location.
     *
     * PRIVACY FIX: Precise GPS coordinates from the browser are NOT stored
     * in Firestore. We store only a fuzzy coordinate (±~550 m) and the
     * city/state label. This prevents any authenticated user who reads the
     * Firestore document from pinpointing the user's home.
     *
     * @param {Object} location - { lat, lon, city, state } — raw from browser
     * @returns {Promise<boolean>} Success status
     */
    async saveStep3(location) {
        try {
            if (!this.isInitialized) throw new Error('Integration not initialized');

            if (!location || location.lat == null || location.lon == null) {
                alert('Location data is missing. Please detect your location and try again.');
                return false;
            }

            // Build a privacy-safe location (fuzzy coords only)
            const safeLocation = buildSafeLocation(
                location.lat,
                location.lon,
                location.city,
                location.state
            );

            await profileService.updateProfileStep(this.currentUser.uid, 3, {
                location: safeLocation
            });

            console.log('✅ Location saved (fuzzy, privacy-safe):', safeLocation);
            return true;
        } catch (error) {
            console.error('❌ Error saving Step 3:', error);
            alert('Failed to save location. Please try again.');
            return false;
        }
    }

    // ── Step 4: Preferences ───────────────────────────────────────────────────

    async saveStep4(preferences) {
        try {
            if (!this.isInitialized) throw new Error('Integration not initialized');

            await profileService.updateProfileStep(this.currentUser.uid, 4, {
                preferences: preferences
            });

            return true;
        } catch (error) {
            console.error('❌ Error saving Step 4:', error);
            alert('Failed to save preferences. Please try again.');
            return false;
        }
    }

    // ── Step 5: Bio ───────────────────────────────────────────────────────────

    async saveStep5(bio) {
        try {
            if (!this.isInitialized) throw new Error('Integration not initialized');

            const updates = {
                bio: bio || '',
                photoURL: this.currentUser.photoURL || null
            };

            await profileService.updateProfileStep(this.currentUser.uid, 5, updates);
            await profileService.markProfileComplete(this.currentUser.uid);

            return true;
        } catch (error) {
            console.error('❌ Error saving Step 5:', error);
            alert('Failed to save bio. Please try again.');
            return false;
        }
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    async getCurrentProfile() {
        try {
            if (!this.currentUser) return null;
            return await profileService.getUserProfile(this.currentUser.uid);
        } catch (error) {
            console.error('❌ Error getting profile:', error);
            return null;
        }
    }

    setButtonLoading(button, loading) {
        if (loading) {
            button.dataset.originalText = button.textContent;
            button.textContent = 'Saving...';
            button.disabled = true;
        } else {
            button.textContent = button.dataset.originalText || 'Next';
            button.disabled = false;
        }
    }

    showError(message) {
        console.error('Error:', message);
        alert(message);
    }
}

// Singleton instance
export const profileSetupIntegration = new ProfileSetupIntegration();
window.profileSetupIntegration = profileSetupIntegration;

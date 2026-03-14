// Profile Service - User Profile Management
import { firestoreService } from './firestore-service.js';
import { auth } from './firebase-config.js';

class ProfileService {
    constructor() {
        this.currentProfile = null;
        this.profileListener = null;
        this.COLLECTION_NAME = 'users';
    }

    // ==================== Profile CRUD Operations ====================

    async getUserProfile(uid, useCache = true) {
        try {
            // Check in-memory cache first
            if (useCache && this.currentProfile && this.currentProfile.uid === uid) {
                console.log('📦 Using cached profile');
                return this.currentProfile;
            }

            // Check localStorage
            const cachedProfile = this.getCachedProfile();
            if (useCache && cachedProfile && cachedProfile.uid === uid) {
                console.log('📦 Using localStorage cached profile');
                this.currentProfile = cachedProfile;
                return cachedProfile;
            }

            // Fetch from Firestore
            console.log('🔍 Fetching profile from Firestore...');
            const profile = await firestoreService.getDocument(this.COLLECTION_NAME, uid);

            if (profile) {
                this.currentProfile = profile;
                this.setCachedProfile(profile);
                console.log('✅ Profile loaded successfully');
                return profile;
            }

            console.warn('⚠️ Profile not found');
            return null;
        } catch (error) {
            console.error('❌ Error getting user profile:', error);
            // Return cached profile as fallback
            return this.getCachedProfile();
        }
    }

    async createProfile(uid, profileData) {
        try {
            // PRIVACY FIX (#3): Strip email before it ever reaches Firestore.
            // Email is available from Firebase Auth and must not be stored in
            // the database where read access could expose it to other users.
            const { email, ...safeProfileData } = profileData;

            const defaultProfile = {
                uid,
                // email deliberately omitted
                displayName: safeProfileData.displayName || '',
                photoURL: safeProfileData.photoURL || null,
                bio: '',
                profileComplete: false,
                setupStep: 0,
                interests: [],
                availability: [
                    { day: 'Saturday', slots: ['Afternoon (12PM - 5PM)'] },
                    { day: 'Sunday',   slots: ['Afternoon (12PM - 5PM)'] }
                ],
                location: null,
                preferences: {
                    radius: 10,
                    language: 'English',
                    genderPreference: 'Any',
                    ageRange: { min: 18, max: 65 }
                },
                stats: {
                    joinedGroups: 0,
                    createdGroups: 0,
                    upcomingActivities: 0
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const profile = { ...defaultProfile, ...safeProfileData };

            await firestoreService.setDocument(this.COLLECTION_NAME, uid, profile);

            this.currentProfile = profile;
            this.setCachedProfile(profile);

            console.log('✅ Profile created successfully');
            return profile;
        } catch (error) {
            console.error('❌ Error creating profile:', error);
            throw error;
        }
    }

    async updateProfile(uid, updates) {
        try {
            // PRIVACY FIX (#3): Strip email if accidentally included in updates
            const { email, ...safeUpdates } = updates;
            if (email) {
                console.warn('⚠️ Attempted to save email to Firestore — blocked for privacy.');
            }

            await firestoreService.updateDocument(this.COLLECTION_NAME, uid, safeUpdates);

            // Update cache
            if (this.currentProfile && this.currentProfile.uid === uid) {
                this.currentProfile = { ...this.currentProfile, ...safeUpdates };
                this.setCachedProfile(this.currentProfile);
            }

            console.log('✅ Profile updated successfully');
        } catch (error) {
            console.error('❌ Error updating profile:', error);
            throw error;
        }
    }

    async updateProfileStep(uid, step, data) {
        try {
            // PRIVACY FIX (#3): Strip email if accidentally included
            const { email, ...safeData } = data;

            const updates = {
                ...safeData,
                setupStep: step
            };

            // Use setDocument with merge to create document if it doesn't exist
            await firestoreService.setDocument(this.COLLECTION_NAME, uid, updates, true);

            // Update cache
            if (this.currentProfile && this.currentProfile.uid === uid) {
                this.currentProfile = { ...this.currentProfile, ...updates };
                this.setCachedProfile(this.currentProfile);
            }

            console.log(`✅ Profile step ${step} saved`);
        } catch (error) {
            console.error(`❌ Error saving profile step ${step}:`, error);
            throw error;
        }
    }

    async markProfileComplete(uid) {
        try {
            // Use setDocument with merge to ensure document exists
            await firestoreService.setDocument(this.COLLECTION_NAME, uid, {
                profileComplete: true,
                setupStep: 5
            }, true);
            console.log('✅ Profile marked as complete');
        } catch (error) {
            console.error('❌ Error marking profile complete:', error);
            throw error;
        }
    }

    async deleteProfile(uid) {
        try {
            await firestoreService.deleteDocument(this.COLLECTION_NAME, uid);
            this.currentProfile = null;
            this.clearCache();
            console.log('✅ Profile deleted successfully');
        } catch (error) {
            console.error('❌ Error deleting profile:', error);
            throw error;
        }
    }

    // ==================== Real-time Sync ====================

    subscribeToProfile(uid, callback) {
        try {
            const unsubscribe = firestoreService.onDocumentChange(
                this.COLLECTION_NAME,
                uid,
                (profile, error) => {
                    if (error) {
                        console.error('❌ Real-time profile update error:', error);
                        callback(null, error);
                        return;
                    }

                    if (profile) {
                        // CRITICAL: Ensure uid is always included in the profile object
                        const profileWithUid = {
                            ...profile,
                            uid: profile.uid || uid
                        };
                        this.currentProfile = profileWithUid;
                        this.setCachedProfile(profileWithUid);
                        console.log('🔄 Real-time profile update received');
                        callback(profileWithUid, null);
                    } else {
                        callback(null, null);
                    }
                }
            );
            return unsubscribe;
        } catch (error) {
            console.error('❌ Error subscribing to profile:', error);
            callback(null, error);
            return () => {};
        }
    }

    unsubscribe() {
        if (this.profileListener) {
            this.profileListener();
            this.profileListener = null;
            console.log('🔇 Unsubscribed from profile updates');
        }
    }

    // ==================== Cache Management ====================

    getCachedProfile() {
        try {
            const cached = localStorage.getItem('userProfile');
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('❌ Error reading cached profile:', error);
            return null;
        }
    }

    setCachedProfile(profile) {
        try {
            localStorage.setItem('userProfile', JSON.stringify(profile));
            console.log('💾 Profile cached to localStorage');
        } catch (error) {
            console.error('❌ Error caching profile:', error);
        }
    }

    clearCache() {
        try {
            localStorage.removeItem('userProfile');
            this.currentProfile = null;
            console.log('🗑️ Profile cache cleared');
        } catch (error) {
            console.error('❌ Error clearing cache:', error);
        }
    }

    // ==================== Utility Methods ====================

    isProfileComplete(profile) {
        if (!profile) return false;
        return profile.profileComplete === true;
    }

    getCurrentStep(profile) {
        if (!profile) return 0;
        return profile.setupStep || 0;
    }

    validateProfile(profile) {
        const errors = [];

        if (!profile.displayName || profile.displayName.trim().length === 0) {
            errors.push('Display name is required');
        }

        // PRIVACY FIX (#3): email validation removed — email is no longer
        // stored in Firestore and should not be validated here.
        // Use auth.currentUser.email anywhere email is needed.

        if (profile.interests && profile.interests.length === 0) {
            errors.push('At least one interest is required');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    async getCurrentUserProfile() {
        const user = auth.currentUser;
        if (!user) {
            console.warn('⚠️ No authenticated user');
            return null;
        }
        return await this.getUserProfile(user.uid);
    }
}

// Create singleton instance
export const profileService = new ProfileService();

console.log('✅ Profile Service initialized');

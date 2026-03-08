// Create Group Integration - Handle Group Creation
import { groupService } from './group-service.js';
import { auth } from './firebase-config.js';
import { profileService } from './profile-service.js';

console.log('📝 Create Group Integration loaded');

// Wait for authentication
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        console.warn('⚠️ No authenticated user, redirecting to login...');
        window.location.href = 'login.html';
        return;
    }

    console.log('✅ User authenticated:', user.email);

    // Initialize form
    initCreateGroupForm(user);
});

/**
 * Initialize create group form
 * @param {Object} user - Firebase user object
 */
function initCreateGroupForm(user) {
    const form = document.getElementById('create-group-form');

    if (!form) {
        console.error('❌ Create group form not found');
        return;
    }

    // Pre-fill location from user profile
    prefillUserLocation(user.uid);
    initLocationInteractions();

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleCreateGroup(user.uid);
    });

    console.log('✅ Create group form initialized');
}

/**
 * Pre-fill location from user profile
 * @param {string} userId - User ID
 */
async function prefillUserLocation(userId) {
    try {
        const profile = await profileService.getUserProfile(userId);

        if (profile && profile.location && profile.location.lat && profile.location.lon) {
            document.getElementById('group-lat').value = profile.location.lat;
            document.getElementById('group-lon').value = profile.location.lon;
            document.getElementById('group-city-hidden').value = profile.location.city || '';
            document.getElementById('group-state-hidden').value = profile.location.state || '';

            const statusLabel = document.getElementById('group-location-label');
            const statusCoords = document.getElementById('group-location-coords');
            const statusPill = document.getElementById('group-location-status');
            
            let label = profile.location.city || 'Unknown City';
            if (profile.location.state) label += `, ${profile.location.state}`;
            
            if (statusLabel) statusLabel.textContent = `📍 ${label}`;
            if (statusCoords) statusCoords.textContent = `Based on your profile location`;
            if (statusPill) statusPill.style.display = 'block';

            console.log('✅ Pre-filled location from profile');
        }
    } catch (error) {
        console.error('❌ Error pre-filling location:', error);
    }
}

/**
 * Handle create group form submission
 * @param {string} userId - User ID
 */
async function handleCreateGroup(userId) {
    try {
        console.log('📝 Creating group...');

        // Show loading state
        const submitBtn = document.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';

        // Collect form data
        const formData = collectFormData();

        // Validate form data
        const validation = validateFormData(formData);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Directly use parsed coordinates from the new inputs
        const coordinates = { lat: formData.lat, lng: formData.lon };

        // Prepare group data
        const groupData = {
            name: formData.name,
            description: formData.description,
            category: formData.category,
            schedule: {
                day: formData.scheduleDay,
                time: formData.scheduleTime,
                endTime: formData.scheduleEndTime || null,
                recurring: formData.scheduleRecurring
            },
            location: {
                city: formData.city,
                state: formData.state,
                coordinates: coordinates
            },
            tags: formData.tags,
            skillLevel: formData.skillLevel,
            language: formData.language || 'English',
            privacy: formData.privacy,
            maxMembers: formData.maxMembers
        };

        console.log('📍 Group location:', formData.city, coordinates);

        // Create group in Firestore
        const groupId = await groupService.createGroup(groupData, userId);

        console.log('✅ Group created successfully:', groupId);

        // Show success message
        showMessage('success', 'Group created successfully! Redirecting...');

        // Redirect to group details page
        setTimeout(() => {
            window.location.href = `group-details.html?id=${groupId}`;
        }, 1500);

    } catch (error) {
        console.error('❌ Error creating group:', error);
        showMessage('error', error.message || 'Failed to create group. Please try again.');

        // Reset button
        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Group';
    }
}

/**
 * Collect form data
 * @returns {Object} Form data
 */
function collectFormData() {
    return {
        name: document.getElementById('group-name').value.trim(),
        description: document.getElementById('group-description').value.trim(),
        category: document.getElementById('group-category').value,
        lat: parseFloat(document.getElementById('group-lat').value),
        lon: parseFloat(document.getElementById('group-lon').value),
        city: document.getElementById('group-city-hidden').value.trim() || 'Unknown',
        state: document.getElementById('group-state-hidden').value.trim() || '',
        scheduleDay: document.getElementById('schedule-day').value,
        scheduleTime: document.getElementById('schedule-time').value,
        scheduleRecurring: document.getElementById('schedule-recurring').checked,
        skillLevel: document.getElementById('skill-level').value,
        privacy: document.getElementById('group-privacy').value,
        maxMembers: parseInt(document.getElementById('max-members').value) || null,
        tags: document.getElementById('group-tags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
    };
}



/**
 * Validate form data
 * @param {Object} data - Form data
 * @returns {Object} Validation result {valid, error}
 */
function validateFormData(data) {
    // Required fields
    if (!data.name) {
        return { valid: false, error: 'Group name is required' };
    }

    if (!data.description) {
        return { valid: false, error: 'Description is required' };
    }

    if (!data.category) {
        return { valid: false, error: 'Category is required' };
    }

    if (isNaN(data.lat) || isNaN(data.lon)) {
        return { valid: false, error: 'Location is required. Please use the Current Location button or paste a Maps link.' };
    }

    // Name length
    if (data.name.length < 3) {
        return { valid: false, error: 'Group name must be at least 3 characters' };
    }

    if (data.name.length > 100) {
        return { valid: false, error: 'Group name must be less than 100 characters' };
    }

    // Description length
    if (data.description.length < 10) {
        return { valid: false, error: 'Description must be at least 10 characters' };
    }

    if (data.description.length > 1000) {
        return { valid: false, error: 'Description must be less than 1000 characters' };
    }

    // Max members validation
    if (data.maxMembers !== null && data.maxMembers < 2) {
        return { valid: false, error: 'Max members must be at least 2' };
    }

    // Tags validation
    if (data.tags.length > 10) {
        return { valid: false, error: 'Maximum 10 tags allowed' };
    }

    return { valid: true };
}

/**
 * Show success or error message
 * @param {string} type - 'success' or 'error'
 * @param {string} message - Message to display
 */
function showMessage(type, message) {
    // Remove existing messages
    const existingMessage = document.querySelector('.message-banner');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create message banner
    const banner = document.createElement('div');
    banner.className = 'message-banner';
    banner.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 16px 24px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideDown 0.3s ease-out;
    `;

    if (type === 'success') {
        banner.style.background = 'var(--success)';
        banner.style.color = 'white';
        banner.textContent = '✅ ' + message;
    } else {
        banner.style.background = 'var(--error)';
        banner.style.color = 'white';
        banner.textContent = '❌ ' + message;
    }

    document.body.appendChild(banner);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        banner.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => banner.remove(), 300);
    }, 5000);
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }

    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

console.log('✅ Create Group Integration ready');

/**
 * Initialize location inputs (geolocation & maps link parser)
 */
function initLocationInteractions() {
    const btnLocation = document.getElementById('btn-use-my-location');
    const inputMaps = document.getElementById('maps-link-input');
    const latField = document.getElementById('group-lat');
    const lonField = document.getElementById('group-lon');
    const cityField = document.getElementById('group-city-hidden');
    const stateField = document.getElementById('group-state-hidden');
    const statusPill = document.getElementById('group-location-status');
    const statusLabel = document.getElementById('group-location-label');
    const statusCoords = document.getElementById('group-location-coords');

    function setLocationSuccess(lat, lon, labelSource) {
        latField.value = lat;
        lonField.value = lon;
        statusLabel.textContent = '📍 Location Set';
        statusCoords.textContent = `${lat.toFixed(5)}, ${lon.toFixed(5)} (${labelSource})`;
        statusPill.style.display = 'block';
        
        // Reverse geocode to get city/state for the group
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
            .then(r => r.json())
            .then(data => {
                const addr = data.address || {};
                cityField.value = addr.city || addr.town || addr.village || addr.county || 'Unknown';
                stateField.value = addr.state || '';
                let label = cityField.value;
                if (stateField.value) label += `, ${stateField.value}`;
                statusLabel.textContent = `📍 ${label}`;
            }).catch(() => {
                cityField.value = 'Unknown';
                stateField.value = '';
            });
    }

    if (btnLocation) {
        btnLocation.addEventListener('click', () => {
            if (!navigator.geolocation) {
                alert('Geolocation is not supported by your browser.');
                return;
            }
            const oldText = btnLocation.innerHTML;
            btnLocation.innerHTML = '<span>📡</span> Detecting...';
            btnLocation.disabled = true;

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLocationSuccess(pos.coords.latitude, pos.coords.longitude, 'GPS');
                    btnLocation.innerHTML = '<span>✅</span> Location Captured';
                    btnLocation.disabled = false;
                },
                (err) => {
                    alert('Location access denied or unavailable.');
                    btnLocation.innerHTML = oldText;
                    btnLocation.disabled = false;
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }

    if (inputMaps) {
        inputMaps.addEventListener('input', () => {
            const url = inputMaps.value.trim();
            if (!url) return;
            
            const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            const qMatch = url.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
            const placeMatch = url.match(/\/place\/(-?\d+\.\d+)[,+](-?\d+\.\d+)/);

            if (atMatch) {
                setLocationSuccess(parseFloat(atMatch[1]), parseFloat(atMatch[2]), 'Maps Link');
            } else if (qMatch) {
                setLocationSuccess(parseFloat(qMatch[1]), parseFloat(qMatch[2]), 'Maps Link');
            } else if (placeMatch) {
                setLocationSuccess(parseFloat(placeMatch[1]), parseFloat(placeMatch[2]), 'Maps Link');
            } else if (url.includes('maps.app.goo.gl')) {
                alert('Short Google Maps links (maps.app.goo.gl) are not supported. Please paste the full long URL containing the coordinates (@lat,lon), or use the "Current Location" button.');
                inputMaps.value = ''; 
            }
        });
    }
}

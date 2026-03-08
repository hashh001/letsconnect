// Group Details Integration - Load and Display Group Details
import { groupService } from './group-service.js';
import { auth } from './firebase-config.js';
import { profileService } from './profile-service.js';
import { joinRequestService } from './join-request-service.js';
import { notificationService } from './notification-service.js';

console.log('📄 Group Details Integration loaded');

let currentGroup = null;
let currentUser = null;

// Wait for authentication
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        console.warn('⚠️ No authenticated user, redirecting to login...');
        window.location.href = 'login.html';
        return;
    }

    console.log('✅ User authenticated:', user.email);
    currentUser = user;

    // Get group ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('id');

    if (!groupId) {
        console.error('❌ No group ID in URL');
        showError('Group not found. Please check the URL.');
        return;
    }

    // Load group details
    await loadGroupDetails(groupId);
});

/**
 * Load group details from Firestore
 * @param {string} groupId - Group ID
 */
async function loadGroupDetails(groupId) {
    try {
        console.log('📊 Loading group details:', groupId);

        // Show loading state
        document.getElementById('loading').style.display = 'block';
        document.getElementById('content').style.display = 'none';

        // Fetch group from Firestore
        const group = await groupService.getGroup(groupId);

        if (!group) {
            throw new Error('Group not found');
        }

        currentGroup = group;
        console.log('✅ Group loaded:', group.name);

        // Update UI
        await updateGroupUI(group);

        // Hide loading, show content
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'grid';

    } catch (error) {
        console.error('❌ Error loading group:', error);
        showError(error.message || 'Failed to load group details');
    }
}

/**
 * Update UI with group data
 * @param {Object} group - Group object
 */
async function updateGroupUI(group) {
    // Basic Info
    document.getElementById('gd-name').textContent = group.name;
    document.getElementById('gd-category').textContent = group.category;
    document.getElementById('gd-desc').textContent = group.description;
    document.getElementById('gd-members').textContent = `${group.memberCount} Members`;

    // Hero color based on category
    const categoryColors = {
        'Sports': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'Education': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'Social': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'Arts': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'Technology': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'Health': 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        'Other': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    };

    const heroColor = document.getElementById('gd-hero-color');
    if (heroColor) {
        heroColor.style.background = categoryColors[group.category] || categoryColors['Other'];
        heroColor.textContent = group.name.charAt(0).toUpperCase();
    }

    const hero = document.getElementById('gd-hero');
    if (hero) {
        hero.style.background = categoryColors[group.category] || categoryColors['Other'];
    }

    // Tags
    const tagsContainer = document.getElementById('gd-tags');
    if (tagsContainer && group.tags && group.tags.length > 0) {
        tagsContainer.innerHTML = group.tags.map(tag => `
            <span class="tag">${tag}</span>
        `).join('');
    } else if (tagsContainer) {
        tagsContainer.innerHTML = '<p style="color: var(--text-muted);">No tags added</p>';
    }

    // Schedule
    const timeElement = document.getElementById('gd-time');
    if (timeElement) {
        if (group.schedule?.day && group.schedule?.time) {
            const recurring = group.schedule.recurring ? ' (Weekly)' : '';
            timeElement.textContent = `${group.schedule.day} at ${group.schedule.time}${recurring}`;
        } else {
            timeElement.textContent = 'Not scheduled';
        }
    }

    // Location
    const locationElement = document.getElementById('gd-location');
    if (locationElement) {
        const city = group.location?.city || group.location?.coordinates?.city || 'Unknown';
        const state = group.location?.state || '';
        locationElement.textContent = state ? `${city}, ${state}` : city;
    }

    // Distance (placeholder - would need user location)
    const distanceElement = document.getElementById('gd-distance');
    if (distanceElement) {
        distanceElement.textContent = 'Location nearby';
    }

    // Skill Level
    const skillElement = document.getElementById('gd-skill');
    if (skillElement) {
        skillElement.textContent = group.skillLevel;
    }

    // Privacy
    const privacyElement = document.getElementById('gd-privacy');
    if (privacyElement) {
        privacyElement.textContent = group.privacy === 'open' ? 'Open' : 'Closed';
    }

    // Wire join button with live real-time listener
    await wireJoinButton(group);

    // Show admin controls ONLY if user is the creator
    if (group.creatorId === currentUser.uid) {
        showAdminControls(group);
    }

    // Load navbar pending badge for creator
    loadNavBadge();
}

/**
 * Wire the join button to a real-time request listener.
 * The button state updates instantly when the creator approves or rejects.
 * @param {Object} group - Group object
 */
async function wireJoinButton(group) {
    const joinBtn = document.getElementById('gd-join-btn');
    if (!joinBtn) return;

    const isMember  = await groupService.isMember(group.id, currentUser.uid);
    const isCreator = group.creatorId === currentUser.uid;

    if (isCreator) {
        joinBtn.textContent = '👑 You created this group';
        joinBtn.className   = 'btn btn-secondary';
        joinBtn.disabled    = true;
        return;
    }

    if (isMember) {
        joinBtn.textContent = 'Leave Group';
        joinBtn.className   = 'btn btn-secondary';
        joinBtn.onclick     = () => handleLeaveGroup(group.id);
        return;
    }

    // Render button based on a request doc (or null = no request yet)
    const renderBtn = (req) => {
        if (!req) {
            joinBtn.textContent = 'Request to Join';
            joinBtn.className   = 'btn btn-primary';
            joinBtn.disabled    = false;
            joinBtn.onclick     = () => openJoinModal(group);
        } else if (req.status === 'pending') {
            joinBtn.textContent = '⏳ Request Pending';
            joinBtn.className   = 'btn btn-secondary';
            joinBtn.disabled    = true;
            joinBtn.onclick     = null;
        } else if (req.status === 'approved') {
            joinBtn.textContent = '✅ Approved — check your email';
            joinBtn.className   = 'btn btn-secondary';
            joinBtn.disabled    = true;
            joinBtn.onclick     = null;
            showMessage('success', `🎉 Your request to join "${group.name}" was approved!`);
        } else if (req.status === 'rejected') {
            joinBtn.textContent = 'Request to Join Again';
            joinBtn.className   = 'btn btn-primary';
            joinBtn.disabled    = false;
            joinBtn.onclick     = () => openJoinModal(group);
        }
    };

    // Subscribe: fires immediately, then live on every status change
    joinRequestService.subscribeToUserRequest(currentUser.uid, group.id, renderBtn);
}


/**
 * Open the Request to Join modal
 * @param {Object} group
 */
function openJoinModal(group) {
    const modal = document.getElementById('join-request-modal');
    const messageEl = document.getElementById('join-message');
    const countEl = document.getElementById('msg-count');
    const confirmBtn = document.getElementById('confirm-join-btn');
    const cancelBtn = document.getElementById('cancel-join-btn');
    const closeBtn = document.getElementById('close-join-modal');

    if (!modal) return;

    messageEl.value = '';
    countEl.textContent = '0';
    modal.style.display = 'flex';

    messageEl.oninput = () => { countEl.textContent = messageEl.value.length; };

    const closeModal = () => { modal.style.display = 'none'; };
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    confirmBtn.onclick = async () => {
        const message = messageEl.value.trim();
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Sending...';

        try {
            await joinRequestService.sendRequest(group, currentUser, message);
            closeModal();
            showMessage('success', 'Request sent! The creator will review it shortly.');

            // Update button state
            const joinBtn = document.getElementById('gd-join-btn');
            if (joinBtn) {
                joinBtn.textContent = '⏳ Request Pending';
                joinBtn.className = 'btn btn-secondary';
                joinBtn.disabled = true;
                joinBtn.onclick = null;
            }
        } catch (err) {
            showMessage('error', err.message || 'Failed to send request.');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Send Request';
        }
    };
}

/**
 * Show admin controls
 * @param {Object} group - Group object
 */
function showAdminControls(group) {
    // Create admin controls section if it doesn't exist
    let adminSection = document.getElementById('admin-controls');

    if (!adminSection) {
        const sidebar = document.querySelector('aside > div');
        adminSection = document.createElement('div');
        adminSection.id = 'admin-controls';
        adminSection.style.cssText = 'margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--surface-200);';
        adminSection.innerHTML = `
            <h3 style="margin-bottom: 16px; color: var(--base-white); font-size: 18px; margin-top: 0;">
                👑 Admin Controls
            </h3>
            <button id="edit-group-btn" class="btn btn-secondary" style="width: 100%; justify-content: center; margin-bottom: 8px;">
                Edit Group
            </button>
            <button id="delete-group-btn" class="btn btn-danger" style="width: 100%; justify-content: center;">
                Delete Group
            </button>
        `;

        if (sidebar) {
            sidebar.appendChild(adminSection);
        }
    }

    // Add event listeners
    const editBtn = document.getElementById('edit-group-btn');
    if (editBtn) {
        editBtn.onclick = () => handleEditGroup(group.id);
    }

    const deleteBtn = document.getElementById('delete-group-btn');
    if (deleteBtn) {
        deleteBtn.onclick = () => handleDeleteGroup(group.id);
    }

    adminSection.style.display = 'block';
}

/**
 * Handle join group (now uses request flow - kept for backward compat)
 */
async function handleJoinGroup(groupId) {
    openJoinModal(currentGroup);
}

/**
 * Handle leave group
 * @param {string} groupId - Group ID
 */
async function handleLeaveGroup(groupId) {
    if (!confirm('Are you sure you want to leave this group?')) {
        return;
    }

    try {
        console.log('👋 Leaving group:', groupId);

        const leaveBtn = document.getElementById('gd-join-btn');
        leaveBtn.disabled = true;
        leaveBtn.textContent = 'Leaving...';

        await groupService.leaveGroup(groupId, currentUser.uid);

        console.log('✅ Left group successfully');
        showMessage('success', 'You have left the group');

        // Reload group details
        await loadGroupDetails(groupId);

    } catch (error) {
        console.error('❌ Error leaving group:', error);
        showMessage('error', error.message || 'Failed to leave group');

        const leaveBtn = document.getElementById('gd-join-btn');
        leaveBtn.disabled = false;
        leaveBtn.textContent = 'Leave Group';
    }
}

/**
 * Handle edit group
 * @param {string} groupId - Group ID
 */
function handleEditGroup(groupId) {
    window.location.href = `edit-group.html?id=${groupId}`;
}

/**
 * Handle delete group
 * @param {string} groupId - Group ID
 */
async function handleDeleteGroup(groupId) {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
        return;
    }

    try {
        console.log('🗑️ Deleting group:', groupId);

        await groupService.deleteGroup(groupId, currentUser.uid);

        console.log('✅ Group deleted successfully');
        showMessage('success', 'Group deleted successfully. Redirecting...');

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        console.error('❌ Error deleting group:', error);
        showMessage('error', error.message || 'Failed to delete group');
    }
}

/**
 * Show error state
 * @param {string} message - Error message
 */
function showError(message) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 16px;">❌</div>
            <p style="color: var(--error);">${message}</p>
            <a href="dashboard.html" class="btn btn-primary" style="margin-top: 16px;">
                Back to Dashboard
            </a>
        `;
    }
}

/**
 * Show success or error message
 * @param {string} type - 'success', 'error', or 'info'
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
    } else if (type === 'error') {
        banner.style.background = 'var(--error)';
        banner.style.color = 'white';
        banner.textContent = '❌ ' + message;
    } else {
        banner.style.background = 'var(--primary)';
        banner.style.color = 'white';
        banner.textContent = 'ℹ️ ' + message;
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

    .tag {
        display: inline-block;
        padding: 6px 12px;
        background: var(--surface-200);
        color: var(--base-white);
        border-radius: 20px;
        font-size: 14px;
        margin-right: 8px;
        margin-bottom: 8px;
    }
`;
document.head.appendChild(style);

/**
 * Load the pending request count badge for the navbar
 */
async function loadNavBadge() {
    try {
        const badge = document.getElementById('nav-pending-badge');
        if (!badge || !currentUser) return;
        const count = await joinRequestService.getPendingCount(currentUser.uid);
        if (count > 0) {
            badge.style.display = 'inline';
            badge.textContent = count > 9 ? '9+' : count;
        }
    } catch (e) {
        // Silently ignore — badge is non-critical
    }
}

console.log('✅ Group Details Integration ready');

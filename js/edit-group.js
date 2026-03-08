/**
 * Edit Group Page Integration
 */

import { auth } from './firebase-config.js';
import { groupService } from './group-service.js';

// DOM Elements
const form = document.getElementById('edit-group-form');
const loadingOverlay = document.getElementById('loading-overlay');
const saveBtn = document.getElementById('save-btn');
const backBtn = document.getElementById('back-btn');

let currentGroupId = null;
let currentUserId = null;

// Initialization
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    currentUserId = user.uid;

    const urlParams = new URLSearchParams(window.location.search);
    currentGroupId = urlParams.get('id');

    if (!currentGroupId) {
        alert('No group ID provided.');
        window.location.href = 'dashboard';
        return;
    }

    backBtn.href = `group-manager`;

    await loadGroupData();
});

async function loadGroupData() {
    try {
        const group = await groupService.getGroup(currentGroupId);
        if (!group) throw new Error('Group not found');

        if (group.creatorId !== currentUserId) {
            throw new Error('Only the group creator can edit these settings.');
        }

        // Fill form fields
        document.getElementById('group-name').value = group.name || '';
        document.getElementById('group-description').value = group.description || '';
        document.getElementById('group-category').value = group.category || '';
        document.getElementById('group-city').value = group.location?.city || '';
        document.getElementById('group-state').value = group.location?.state || '';
        
        document.getElementById('schedule-day').value = group.schedule?.day || '';
        document.getElementById('schedule-time').value = group.schedule?.time || '';
        document.getElementById('schedule-recurring').checked = group.schedule?.recurring || false;

        document.getElementById('skill-level').value = group.skillLevel || 'beginner';
        document.getElementById('language').value = group.language || 'English';
        document.getElementById('group-privacy').value = group.privacy || 'open';
        
        if (group.settings?.maxMembers) {
            document.getElementById('max-members').value = group.settings.maxMembers;
        }

        if (group.tags && Array.isArray(group.tags)) {
            document.getElementById('group-tags').value = group.tags.join(', ');
        }

        // Hide loader, show form
        loadingOverlay.style.display = 'none';
        form.style.display = 'flex';

    } catch (error) {
        console.error('Error loading group:', error);
        loadingOverlay.innerHTML = `<div style="color:red; text-align:center;">
            <h3>Error loading group</h3>
            <p>${error.message}</p>
            <a href="dashboard.html" class="btn btn-primary" style="margin-top:20px;">Go Back</a>
        </div>`;
    }
}

// Handle Form Submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Disable button, show loading
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.innerHTML = 'Saving... <span style="animation: pulse 1s infinite">♻️</span>';

    try {
        // Collect Tags
        const tagsInput = document.getElementById('group-tags').value;
        const tags = tagsInput.split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        // Max Members
        const maxMembersInput = document.getElementById('max-members').value;
        const maxMembers = maxMembersInput ? parseInt(maxMembersInput) : null;

        // Construct updates object
        const updates = {
            name: document.getElementById('group-name').value.trim(),
            description: document.getElementById('group-description').value.trim(),
            category: document.getElementById('group-category').value,
            location: {
                city: document.getElementById('group-city').value.trim(),
                state: document.getElementById('group-state').value.trim(),
                country: 'India',
                // Keep existing coordinates if present, or let a cloud function recalculate them
            },
            schedule: {
                day: document.getElementById('schedule-day').value,
                time: document.getElementById('schedule-time').value,
                recurring: document.getElementById('schedule-recurring').checked
            },
            tags: tags,
            skillLevel: document.getElementById('skill-level').value,
            language: document.getElementById('language').value,
            privacy: document.getElementById('group-privacy').value,
            settings: {
                maxMembers: maxMembers
            }
        };

        // We only overwrite the fields we provide to updateGroup (which uses updateDoc)
        await groupService.updateGroup(currentGroupId, updates, currentUserId);

        // Success -> Redirect back to manager
        window.location.href = `group-manager.html?id=${currentGroupId}`;

    } catch (error) {
        console.error('Error updating group:', error);
        alert(error.message || 'Failed to update group. Please try again.');
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
});

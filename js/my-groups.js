/**
 * My Groups Page — shows all groups the current user is in or has requested to join
 */
import { auth } from './firebase-config.js';
import { groupService } from './group-service.js';
import { joinRequestService } from './join-request-service.js';
import { profileService } from './profile-service.js';

const categoryColors = {
    'Sports':     'linear-gradient(135deg,#667eea,#764ba2)',
    'Education':  'linear-gradient(135deg,#f093fb,#f5576c)',
    'Social':     'linear-gradient(135deg,#4facfe,#00f2fe)',
    'Arts':       'linear-gradient(135deg,#43e97b,#38f9d7)',
    'Technology': 'linear-gradient(135deg,#fa709a,#fee140)',
    'Health':     'linear-gradient(135deg,#30cfd0,#330867)',
    'Other':      'linear-gradient(135deg,#a8edea,#fed6e3)'
};

auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }

    // Set nav avatar initials
    try {
        const profile = await profileService.getUserProfile(user.uid);
        const avatar  = document.getElementById('nav-avatar');
        if (avatar && profile?.displayName) {
            avatar.textContent = profile.displayName.charAt(0).toUpperCase();
        }
    } catch (_) {}

    await loadMyGroups(user);
});

async function loadMyGroups(user) {
    try {
        // Fetch groups user is a member of
        const memberGroups = await groupService.getUserGroups(user.uid);

        // Fetch all join requests made by this user
        const allRequests = await joinRequestService.getRequestsByUser(user.uid);

        // Separate requests by status
        const pendingRequests  = allRequests.filter(r => r.status === 'pending');
        const rejectedRequests = allRequests.filter(r => r.status === 'rejected');

        // Fetch group objects for pending/rejected (so we can show group details)
        const fetchGroup = async (req) => {
            try {
                const g = await groupService.getGroup(req.groupId);
                return g ? { ...g, _requestStatus: req.status, _requestId: req.id, _message: req.message } : null;
            } catch { return null; }
        };

        const [pendingGroups, rejectedGroups] = await Promise.all([
            Promise.all(pendingRequests.map(fetchGroup)),
            Promise.all(rejectedRequests.map(fetchGroup))
        ]);

        const validPending  = pendingGroups.filter(Boolean);
        const validRejected = rejectedGroups.filter(Boolean);

        // Render
        renderJoined(memberGroups, user.uid);
        renderRequests(validPending, 'pending', 'pending-grid', 'pending-count', 'pending-section');
        renderRequests(validRejected, 'rejected', 'rejected-grid', 'rejected-count', 'rejected-section');

        // Toggle collapsed rejected section
        if (validRejected.length > 0) {
            document.getElementById('rejected-divider').style.display = '';
            const toggle = document.getElementById('rejected-toggle');
            const grid   = document.getElementById('rejected-grid');
            toggle.onclick = () => {
                const open = grid.style.display !== 'none';
                grid.style.display = open ? 'none' : 'grid';
                toggle.querySelector('span:last-child').textContent = open ? '▼ Show' : '▲ Hide';
            };
        }

        // Show content, hide loading
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';

    } catch (err) {
        console.error('Error loading my groups:', err);
        document.getElementById('loading-state').innerHTML =
            `<p style="color:var(--error);text-align:center;padding:48px">Failed to load groups: ${err.message}</p>`;
    }
}

function renderJoined(groups, currentUserId) {
    const grid    = document.getElementById('joined-grid');
    const count   = document.getElementById('joined-count');
    const section = document.getElementById('joined-section');

    count.textContent = groups.length;

    if (groups.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="icon">🤝</div>
                <p>You haven't joined any groups yet.</p>
                <a href="dashboard.html" class="btn btn-primary btn-sm">Browse groups</a>
            </div>`;
        return;
    }

    grid.innerHTML = '';
    groups.forEach(group => {
        const isCreator = group.creatorId === currentUserId;
        const card = createGroupCard(group, isCreator ? 'creator' : 'member', currentUserId);
        grid.appendChild(card);
    });
}

function renderRequests(groups, status, gridId, countId, sectionId) {
    const grid    = document.getElementById(gridId);
    const count   = document.getElementById(countId);
    const section = document.getElementById(sectionId);

    count.textContent = groups.length;

    if (groups.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';
    grid.innerHTML = '';
    groups.forEach(group => {
        const card = createGroupCard(group, status, null);
        grid.appendChild(card);
    });
}

function createGroupCard(group, status, currentUserId) {
    const card = document.createElement('div');
    card.className = 'group-card';

    const gradient = categoryColors[group.category] || categoryColors['Other'];
    const letter   = (group.name || '?').charAt(0).toUpperCase();

    const statusLabels = {
        member:   '<span class="status-pill member">✅ Member</span>',
        creator:  '<span class="status-pill creator">👑 Creator</span>',
        pending:  '<span class="status-pill pending">⏳ Pending</span>',
        rejected: '<span class="status-pill rejected">❌ Not Approved</span>'
    };

    const leaveBtn = (status === 'member')
        ? `<button class="btn btn-secondary btn-sm leave-btn" data-group-id="${group.id}">Leave</button>`
        : '';

    const reapplyBtn = (status === 'rejected')
        ? `<a href="group-details.html?id=${group.id}" class="btn btn-primary btn-sm" style="font-size:12px; padding:4px 10px; margin-left:auto;">Re-apply</a>`
        : '';

    card.innerHTML = `
        <div class="group-card-header" style="background: ${gradient};">
            ${letter}
        </div>
        <div class="group-card-body">
            <div class="group-card-name">${group.name}</div>
            <div class="group-card-desc">${group.description || 'No description'}</div>
            <div class="group-card-meta">
                ${statusLabels[status] || ''}
                <span>👥 ${group.memberCount || 0}</span>
                <span>📁 ${group.category || 'Other'}</span>
                ${group.schedule?.day ? `<span>📅 ${group.schedule.day}</span>` : ''}
                ${leaveBtn}
                ${reapplyBtn}
            </div>
        </div>
    `;

    // Click whole card → group details (except button clicks)
    card.onclick = (e) => {
        if (e.target.closest('button, a')) return;
        window.location.href = `group-details.html?id=${group.id}`;
    };

    // Leave button
    const leave = card.querySelector('.leave-btn');
    if (leave) {
        leave.onclick = async (e) => {
            e.stopPropagation();
            if (!confirm(`Leave "${group.name}"?`)) return;
            leave.disabled    = true;
            leave.textContent = 'Leaving...';
            try {
                await groupService.leaveGroup(group.id, currentUserId);
                card.style.opacity    = '0.4';
                card.style.pointerEvents = 'none';
                leave.textContent = 'Left ✓';
                // Refresh after brief delay so the user notices the change
                setTimeout(() => window.location.reload(), 800);
            } catch (err) {
                alert(err.message || 'Could not leave group.');
                leave.disabled    = false;
                leave.textContent = 'Leave';
            }
        };
    }

    return card;
}

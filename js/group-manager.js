// Group Manager Logic - Creator dashboard for managing join requests
import { auth } from './firebase-config.js';
import { joinRequestService } from './join-request-service.js';
import { groupService } from './group-service.js';
import { profileService } from './profile-service.js';

console.log('👑 Group Manager loaded');

let currentUser = null;

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = user;
    await initGroupManager();
});

async function initGroupManager() {
    showLoading(true);

    try {
        // Get groups created by this user
        const allGroups = await groupService.queryGroups();
        const myGroups = allGroups.filter(g => g.creatorId === currentUser.uid);

        if (myGroups.length === 0) {
            showLoading(false);
            document.getElementById('no-groups-state').style.display = 'block';
            return;
        }

        // Get all requests for this creator
        const allRequests = await joinRequestService.getRequestsForCreator(currentUser.uid);

        // Group requests by groupId
        const requestsByGroup = {};
        allRequests.forEach(req => {
            if (!requestsByGroup[req.groupId]) requestsByGroup[req.groupId] = [];
            requestsByGroup[req.groupId].push(req);
        });

        // Fetch active members for each group
        const membersByGroup = {};
        await Promise.all(myGroups.map(async (g) => {
            const members = await groupService.getGroupMembers(g.id);
            membersByGroup[g.id] = members;
        }));

        renderGroups(myGroups, requestsByGroup, membersByGroup);
    } catch (err) {
        console.error('Error loading group manager:', err);
        document.getElementById('loading-state').innerHTML = `
            <p style="color:var(--error)">❌ Failed to load groups. ${err.message}</p>`;
    }
}

function showLoading(show) {
    document.getElementById('loading-state').style.display = show ? 'block' : 'none';
    document.getElementById('groups-container').style.display = show ? 'none' : 'block';
}

function renderGroups(groups, requestsByGroup, membersByGroup) {
    showLoading(false);
    const container = document.getElementById('groups-container');
    container.innerHTML = '';

    groups.forEach(group => {
        const requests = requestsByGroup[group.id] || [];
        const members = membersByGroup[group.id] || [];
        const pending = requests.filter(r => r.status === 'pending');
        const block = createGroupBlock(group, requests, members, pending.length);
        container.appendChild(block);
    });
}

function createGroupBlock(group, requests, members, pendingCount) {
    const block = document.createElement('div');
    block.className = 'group-block';

    const header = document.createElement('div');
    header.className = 'group-block-header';
    header.innerHTML = `
        <div class="group-block-title">${group.name}</div>
        <div class="group-block-meta">
            <span>👥 ${group.memberCount || 0} members</span>
            ${pendingCount > 0 ? `<span class="badge-pending">⏳ ${pendingCount} pending</span>` : '<span>No pending</span>'}
            <span style="color: var(--text-muted); font-size: 18px;">▾</span>
        </div>
    `;

    const body = document.createElement('div');
    body.className = 'group-block-body';

    // Tab bar
    body.innerHTML = `
        <div class="tab-bar">
            <button class="tab-btn active" data-tab="pending">⏳ Pending (${requests.filter(r=>r.status==='pending').length})</button>
            <button class="tab-btn" data-tab="members">👥 Members (${members.length})</button>
            <button class="tab-btn" data-tab="approved">✅ Past Approved (${requests.filter(r=>r.status==='approved').length})</button>
            <button class="tab-btn" data-tab="rejected">❌ Rejected (${requests.filter(r=>r.status==='rejected').length})</button>
            <a href="edit-group?id=${group.id}" class="btn btn-ghost btn-sm" style="margin-left: auto; align-self: center; text-decoration: none; padding: 4px 12px;">⚙️ Edit Settings</a>
        </div>
        <div class="tab-content"></div>
    `;

    const tabContent = body.querySelector('.tab-content');
    const tabBtns = body.querySelectorAll('.tab-btn');

    function renderTab(tab) {
        if (tab === 'members') {
            if (members.length === 0) {
                tabContent.innerHTML = `<div class="empty-state"><div class="icon">👥</div><p>No active members yet.</p></div>`;
            } else {
                tabContent.innerHTML = '';
                // The creator is technically a member too, let's distinguish them
                members.forEach(m => tabContent.appendChild(createMemberCard(m, group)));
            }
            return;
        }

        const filtered = requests.filter(r => r.status === tab);
        if (filtered.length === 0) {
            tabContent.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>No ${tab} requests.</p></div>`;
        } else {
            tabContent.innerHTML = '';
            filtered.forEach(req => tabContent.appendChild(createRequestCard(req, group)));
        }
    }

    tabBtns.forEach(btn => {
        btn.onclick = () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTab(btn.dataset.tab);
        };
    });

    renderTab('pending'); // default tab

    // Toggle open/close
    header.onclick = () => {
        body.classList.toggle('open');
        const arrow = header.querySelector('span:last-child');
        if (arrow) arrow.textContent = body.classList.contains('open') ? '▴' : '▾';
    };

    // Auto-open if there are pending requests
    if (requests.filter(r => r.status === 'pending').length > 0) {
        body.classList.add('open');
        const arrow = header.querySelector('span:last-child');
        if (arrow) arrow.textContent = '▴';
    }

    block.appendChild(header);
    block.appendChild(body);
    return block;
}

function createRequestCard(req, group) {
    const card = document.createElement('div');
    card.className = 'request-card';
    card.id = `req-${req.id}`;

    const initial = (req.requesterName || 'U')[0].toUpperCase();
    const timestamp = req.createdAt?.seconds
        ? new Date(req.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Recently';

    const isPending = req.status === 'pending';

    card.innerHTML = `
        <div class="req-avatar">${initial}</div>
        <div>
            <div class="req-name">${req.requesterName || 'Unknown User'}</div>
            <div class="req-email-row">
                <span>${req.requesterEmail}</span>
                <button class="copy-btn" title="Copy email" onclick="copyEmail('${req.requesterEmail}', this)">📋 Copy</button>
            </div>
            ${req.message ? `<div class="req-message">"${req.message}"</div>` : ''}
            <div class="req-timestamp">Requested on ${timestamp}</div>
        </div>
        <div class="req-actions">
            <span class="req-status-badge status-${req.status}">${req.status.charAt(0).toUpperCase() + req.status.slice(1)}</span>
            <button class="btn btn-ghost btn-sm" onclick="viewProfile('${req.requesterId}', '${req.requesterName}', '${req.requesterEmail}')">👤 View Profile</button>
            ${isPending ? `
                <button class="btn btn-primary btn-sm" onclick="approveRequest('${req.id}', '${req.groupId}', '${req.requesterEmail}', '${req.requesterName}', '${group.name}')">✅ Accept</button>
                <button class="btn btn-secondary btn-sm" style="color:#ef4444;" onclick="rejectRequest('${req.id}')">❌ Reject</button>
            ` : ''}
        </div>
    `;

    return card;
}

function createMemberCard(member, group) {
    const card = document.createElement('div');
    card.className = 'request-card'; // Reuse the styling
    card.id = `mem-${member.uid}`;

    const isCreator = member.uid === group.creatorId;

    // We don't have full name/email fetched in the quick members list yet, just UIDs.
    // We can fetch profiles on the fly or just display a generic "Member" with a view profile button
    // which handles the fetching.
    card.innerHTML = `
        <div class="req-avatar">M</div>
        <div>
            <div class="req-name">${isCreator ? '👑 Group Creator' : 'Group Member'}</div>
            <div class="req-timestamp">ID: ${member.uid.slice(0, 8)}...</div>
        </div>
        <div class="req-actions">
            <button class="btn btn-ghost btn-sm" onclick="viewProfile('${member.uid}', 'Member', '')">👤 View Profile</button>
            ${!isCreator ? `
                <button class="btn btn-secondary btn-sm" style="color:#ef4444;" onclick="removeMember('${member.uid}', '${group.id}')">🚪 Remove</button>
            ` : ''}
        </div>
    `;

    // Fetch the real name asynchronously
    profileService.getUserProfile(member.uid).then(p => {
        if(p && p.displayName) {
            card.querySelector('.req-avatar').textContent = p.displayName[0].toUpperCase();
            card.querySelector('.req-name').textContent = isCreator ? `👑 ${p.displayName} (Creator)` : p.displayName;
            card.querySelector('.req-timestamp').textContent = `Member since ${member.joinedAt?.toDate().toLocaleDateString() || 'Recently'}`;
            // Update view profile onclick
            const vpBtn = card.querySelector('button[onclick^="viewProfile"]');
            vpBtn.setAttribute('onclick', `viewProfile('${member.uid}', '${p.displayName}', '${p.email || ''}')`);
        }
    });

    return card;
}

// ===== Actions (exposed on window) =====

window.copyEmail = function(email, btn) {
    navigator.clipboard.writeText(email).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => btn.textContent = orig, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = email;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        btn.textContent = '✓ Copied!';
        setTimeout(() => btn.textContent = '📋 Copy', 2000);
    });
};

window.approveRequest = async function(requestId, groupId, requesterEmail, requesterName, groupName) {
    const card = document.getElementById(`req-${requestId}`);
    if (!confirm(`Accept ${requesterName}'s request to join "${groupName}"?`)) return;

    try {
        setCardLoading(card, true);
        await joinRequestService.approveRequest(requestId, currentUser.uid);

        showBanner('success', `✅ ${requesterName} approved! An email with the private group link has been sent to them.`);
        // Refresh the page data
        setTimeout(() => initGroupManager(), 1500);
    } catch (err) {
        showBanner('error', err.message);
        setCardLoading(card, false);
    }
};

window.rejectRequest = async function(requestId) {
    const card = document.getElementById(`req-${requestId}`);
    if (!confirm('Reject this join request? The user will be notified.')) return;

    try {
        setCardLoading(card, true);
        await joinRequestService.rejectRequest(requestId, currentUser.uid);
        showBanner('success', '❌ Request rejected. The user has been notified.');
        setTimeout(() => initGroupManager(), 1500);
    } catch (err) {
        showBanner('error', err.message);
        setCardLoading(card, false);
    }
};

window.removeMember = async function(userId, groupId) {
    const card = document.getElementById(`mem-${userId}`);
    if (!confirm('Are you sure you want to remove this member from the group?')) return;

    try {
        setCardLoading(card, true);
        await groupService.leaveGroup(groupId, userId); // Use leaveGroup to enact removal
        showBanner('success', '🚪 Member removed from the group.');
        setTimeout(() => initGroupManager(), 1000);
    } catch (err) {
        showBanner('error', err.message);
        setCardLoading(card, false);
    }
};

window.viewProfile = async function(userId, name, email) {
    const modal = document.getElementById('profile-modal');
    const content = document.getElementById('profile-modal-content');
    modal.style.display = 'flex';
    content.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:24px;">Loading profile...</p>';

    try {
        const profile = await profileService.getUserProfile(userId);

        if (!profile) {
            content.innerHTML = `
                <h3 style="color:var(--base-white); margin-bottom:8px;">${name}</h3>
                <p style="color:var(--text-muted);">📧 ${email}</p>
                <p style="color:var(--text-muted); margin-top:16px;">Profile details not available yet.</p>`;
            return;
        }

        const interests = profile.interests?.join(', ') || 'Not set';
        const languages = Array.isArray(profile.preferences?.languages)
            ? profile.preferences.languages.join(', ')
            : profile.preferences?.language || 'Not set';
        const bio = profile.bio || '';

        content.innerHTML = `
            <div style="text-align:center; margin-bottom:24px;">
                <div style="width:72px;height:72px;border-radius:50%;background:var(--primary-500);display:inline-flex;align-items:center;justify-content:center;font-size:30px;font-weight:700;color:white;margin-bottom:12px;">
                    ${(name || 'U')[0].toUpperCase()}
                </div>
                <h3 style="color:var(--base-white); margin:0 0 4px;">${name}</h3>
                <p style="color:var(--text-muted); font-size:13px; margin:0;">📧 ${email}</p>
            </div>
            ${bio ? `<div style="background:var(--surface-200);padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;color:var(--text-description);font-style:italic;">"${bio}"</div>` : ''}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
                <div style="background:var(--surface-200);padding:12px;border-radius:8px;">
                    <div style="color:var(--text-muted);margin-bottom:4px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Location</div>
                    <div style="color:var(--base-white);">${profile.location?.city || 'Not set'}</div>
                </div>
                <div style="background:var(--surface-200);padding:12px;border-radius:8px;">
                    <div style="color:var(--text-muted);margin-bottom:4px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Languages</div>
                    <div style="color:var(--base-white);">${languages}</div>
                </div>
            </div>
            <div style="margin-top:12px;background:var(--surface-200);padding:12px;border-radius:8px;font-size:13px;">
                <div style="color:var(--text-muted);margin-bottom:6px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Interests</div>
                <div style="color:var(--base-white);">${interests}</div>
            </div>
            <div style="margin-top:16px;text-align:center;">
                <a href="profile.html?uid=${userId}" target="_blank" class="btn btn-ghost btn-sm">🔗 Full Profile</a>
            </div>`;
    } catch (err) {
        content.innerHTML = `<p style="color:var(--error);">Could not load profile: ${err.message}</p>`;
    }
};

document.getElementById('close-profile-modal').onclick = () => {
    document.getElementById('profile-modal').style.display = 'none';
};
document.getElementById('profile-modal').onclick = (e) => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
};

function setCardLoading(card, loading) {
    if (!card) return;
    card.style.opacity = loading ? '0.5' : '1';
    card.style.pointerEvents = loading ? 'none' : '';
}

function showBanner(type, message) {
    const existing = document.querySelector('.gm-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'gm-banner';
    banner.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        padding: 14px 24px; border-radius: 10px; font-size: 14px; font-weight: 500;
        z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,0.4); max-width: 480px; text-align: center;
        background: ${type === 'success' ? 'var(--success, #10b981)' : 'var(--error, #ef4444)'}; color: white;`;
    banner.textContent = message;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 5000);
}

console.log('✅ Group Manager ready');

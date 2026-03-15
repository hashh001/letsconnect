// notification-dropdown.js — Premium notification panel with modern UI

import { auth } from './firebase-config.js';
import { notificationService } from './notification-service.js';

let currentUser = null;
let unreadCount  = 0;

document.addEventListener('DOMContentLoaded', () => {
    const bellBtn    = document.getElementById('notification-bell');
    const dropdown   = document.getElementById('notification-dropdown');
    const badge      = document.getElementById('notification-badge');
    const list       = document.getElementById('notification-list');
    const markReadBtn= document.getElementById('mark-all-read-btn');

    if (!bellBtn || !dropdown || !badge || !list) {
        console.warn('⚠️ Notification UI elements not found on this page.');
        return;
    }

    // ── Build the dropdown shell (header + footer) if not already in HTML ──
    if (!dropdown.querySelector('.notif-header')) {
        const header = document.createElement('div');
        header.className = 'notif-header';
        header.innerHTML = `
            <span class="notif-header-title">🔔 Notifications</span>
            <span class="notif-header-count" id="notif-unread-count" style="display:none"></span>
        `;

        const footer = document.createElement('div');
        footer.className = 'notif-footer';
        footer.innerHTML = `<button id="mark-all-read-btn">✓ Mark all as read</button>`;

        dropdown.insertBefore(header, list);
        dropdown.appendChild(footer);

        // Re-bind the mark-all-read button (now it's newly created)
        footer.querySelector('#mark-all-read-btn').addEventListener('click', async () => {
            if (!currentUser) return;
            try { await notificationService.markAllRead(currentUser.uid); }
            catch (err) { console.error('Error marking all as read:', err); }
        });
    }

    // ── Toggle dropdown ──
    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.style.display === 'block';
        dropdown.style.display = isOpen ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== bellBtn) {
            dropdown.style.display = 'none';
        }
    });

    dropdown.addEventListener('click', (e) => e.stopPropagation());

    // ── Auth & subscription ──
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            notificationService.subscribeToNotifications(user.uid, renderNotifications);
        } else {
            currentUser = null;
            renderNotifications([]);
        }
    });

    /* ── Render ── */
    function renderNotifications(notifications) {
        unreadCount = notifications.filter(n => !n.read).length;

        // Badge
        if (unreadCount > 0) {
            badge.style.display = 'inline-flex';
            badge.textContent   = unreadCount > 99 ? '99+' : String(unreadCount);
        } else {
            badge.style.display = 'none';
        }

        // Header count chip
        const countChip = dropdown.querySelector('#notif-unread-count');
        if (countChip) {
            if (unreadCount > 0) {
                countChip.style.display = 'inline-flex';
                countChip.textContent   = `${unreadCount} new`;
            } else {
                countChip.style.display = 'none';
            }
        }

        // Empty state
        if (notifications.length === 0) {
            list.innerHTML = `
                <div class="notif-empty">
                    <div class="notif-empty-icon">📭</div>
                    <div class="notif-empty-text">You're all caught up!</div>
                </div>
            `;
            return;
        }

        // Render items
        list.innerHTML = notifications.map(notif => {
            const timeStr = formatTimeAgo(notif.createdAt);
            const { icon, href, iconBg } = getNotifMeta(notif);
            const unreadClass = notif.read ? '' : 'unread';

            return `
            <a href="${href}"
               class="notif-item ${unreadClass}"
               data-id="${notif.id}"
               style="${iconBg ? `--notif-icon-bg: ${iconBg}` : ''}">
                <div class="notif-item-icon">${icon}</div>
                <div class="notif-item-body">
                    <div class="notif-item-msg">${escHtml(notif.message)}</div>
                    <div class="notif-item-time">${timeStr}</div>
                </div>
                ${!notif.read ? '<div class="notif-dot"></div>' : ''}
            </a>`;
        }).join('');

        // Mark individual as read on click
        list.querySelectorAll('.notif-item.unread').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.getAttribute('data-id');
                if (id) notificationService.markRead(id).catch(console.error);
            });
        });
    }

    /* ── Helpers ── */
    function getNotifMeta(notif) {
        const meta = { icon: '🔔', href: '#', iconBg: null };
        if      (notif.type === 'join_request')    { meta.icon = '🤝'; meta.href = 'group-manager.html'; }
        else if (notif.type === 'request_approved'){ meta.icon = '✅'; meta.href = `group-details.html?id=${notif.groupId}`; }
        else if (notif.type === 'request_rejected'){ meta.icon = '❌'; meta.href = '#'; }
        return meta;
    }

    function formatTimeAgo(timestamp) {
        if (!timestamp) return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diff = Date.now() - date.getTime();
        const m = Math.floor(diff / 60000);
        if (m <  1)  return 'Just now';
        if (m <  60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h <  24) return `${h}h ago`;
        const d = Math.floor(h / 24);
        if (d <  7)  return `${d}d ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }

    function escHtml(str) {
        return String(str)
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;');
    }
});

// notification-dropdown.js - Handles the navbar notification bell and dropdown

import { auth } from './firebase-config.js';
import { notificationService } from './notification-service.js';

let currentUser = null;
let unreadCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    const bellBtn = document.getElementById('notification-bell');
    const dropdown = document.getElementById('notification-dropdown');
    const badge = document.getElementById('notification-badge');
    const list = document.getElementById('notification-list');
    const markReadBtn = document.getElementById('mark-all-read-btn');

    if (!bellBtn || !dropdown || !badge || !list) {
        console.warn('⚠️ Notification UI elements not found on this page.');
        return;
    }

    // Toggle dropdown
    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = dropdown.style.display === 'block';
        dropdown.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible && unreadCount > 0) {
            // Optional: Auto-mark read on open, but for now we'll let users use the button
        }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== bellBtn) {
            dropdown.style.display = 'none';
        }
    });

    // Prevent closing when clicking inside dropdown
    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Mark all as read
    if (markReadBtn) {
        markReadBtn.addEventListener('click', async () => {
            if (!currentUser) return;
            try {
                await notificationService.markAllRead(currentUser.uid);
                // UI will update automatically via subscription
            } catch (err) {
                console.error('Error marking all as read:', err);
            }
        });
    }

    // Initialize Auth & Subscribe
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            notificationService.subscribeToNotifications(user.uid, renderNotifications);
        } else {
            currentUser = null;
            renderNotifications([]);
        }
    });

    function renderNotifications(notifications) {
        // Calculate unread count
        unreadCount = notifications.filter(n => !n.read).length;

        // Update badge
        if (unreadCount > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        } else {
            badge.style.display = 'none';
        }

        // Render list
        if (notifications.length === 0) {
            list.innerHTML = `
                <div class="empty-state" style="text-align:center; padding:20px; color:var(--text-muted);">
                    <div class="icon" style="font-size:24px; margin-bottom:8px;">📭</div>
                    <p style="margin:0; font-size:13px;">No new notifications</p>
                </div>
            `;
            return;
        }

        list.innerHTML = notifications.map(notif => {
            const dateStr = notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleDateString() : 'Recently';
            let icon = '🔔';
            let link = '#';

            if (notif.type === 'join_request') {
                icon = '🤝';
                link = `group-manager.html`; // Take them to manage groups
            } else if (notif.type === 'request_approved') {
                icon = '✅';
                link = `group-details.html?id=${notif.groupId}`;
            } else if (notif.type === 'request_rejected') {
                icon = '❌';
            }

            return `
                <a href="${link}" class="notification-item ${notif.read ? '' : 'unread'}" data-id="${notif.id}" style="display:flex; gap:12px; padding:12px; text-decoration:none; color:inherit; border-bottom:1px solid var(--surface-200); background:${notif.read ? 'transparent' : 'var(--surface-150)'}; align-items:flex-start; transition:background 0.2s;">
                    <div style="font-size:20px;">${icon}</div>
                    <div style="flex:1;">
                        <div style="font-size:13px; color:var(--base-white); margin-bottom:4px;">${notif.message}</div>
                        <div style="font-size:11px; color:var(--text-muted);">${dateStr}</div>
                    </div>
                    ${!notif.read ? `<div style="width:8px; height:8px; background:var(--primary-500); border-radius:50%; align-self:center;"></div>` : ''}
                </a>
            `;
        }).join('');

        // Add click listeners to individual notifications to mark them as read
        const items = list.querySelectorAll('.notification-item.unread');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const notifId = item.getAttribute('data-id');
                notificationService.markRead(notifId).catch(console.error);
            });
        });
    }
});

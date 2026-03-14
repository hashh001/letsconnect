// Notification Service - In-app notifications stored per user in Firestore
import { firestoreService } from './firestore-service.js';
import { serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

class NotificationService {
    constructor() {
        this.collectionName = 'notifications';
        this._unsubscribers = new Map(); // track active listeners
    }

    /**
     * Add a notification for a user
     * @param {string} userId - The recipient user's UID
     * @param {Object} notif - { type, groupId, groupName, message }
     */
    async addNotification(userId, notif) {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await firestoreService.setDocument(this.collectionName, notifId, {
            userId,
            ...notif,
            read: false,
            createdAt: serverTimestamp()
        });
        console.log('🔔 Notification added for user:', userId);
    }

    /**
     * Get all notifications for a user, newest first (one-time fetch)
     * @param {string} userId
     * @returns {Promise<Array>}
     */
    async getNotifications(userId) {
        const results = await firestoreService.queryDocuments(this.collectionName, [
            { field: 'userId', operator: '==', value: userId }
        ]);
        return results.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }

    /**
     * Subscribe to real-time notifications for a user.
     * The callback fires immediately with the current list, then on every change.
     *
     * @param {string} userId
     * @param {Function} callback  - (notifications: Array) => void
     * @returns {Function} unsubscribe — call to stop listening
     */
    subscribeToNotifications(userId, callback) {
        // Cancel any existing subscription for this user
        this.unsubscribeNotifications(userId);

        const unsub = firestoreService.onCollectionChange(
            this.collectionName,
            [{ field: 'userId', operator: '==', value: userId }],
            (docs) => {
                const sorted = docs.sort(
                    (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
                );
                callback(sorted);
            }
        );

        this._unsubscribers.set(`notifs_${userId}`, unsub);
        return () => this.unsubscribeNotifications(userId);
    }

    /**
     * Stop listening to notifications for a user
     * @param {string} userId
     */
    unsubscribeNotifications(userId) {
        const key = `notifs_${userId}`;
        if (this._unsubscribers.has(key)) {
            this._unsubscribers.get(key)();
            this._unsubscribers.delete(key);
        }
    }

    /**
     * Get unread notification count for a user (one-time fetch)
     * @param {string} userId
     * @returns {Promise<number>}
     */
    async getUnreadCount(userId) {
        try {
            const results = await firestoreService.queryDocuments(this.collectionName, [
                { field: 'userId', operator: '==', value: userId },
                { field: 'read',   operator: '==', value: false }
            ]);
            return results.length;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Subscribe to real-time unread notification count.
     * @param {string}   userId
     * @param {Function} callback  - (count: number) => void
     * @returns {Function} unsubscribe
     */
    subscribeToUnreadCount(userId, callback) {
        this.unsubscribeUnreadCount(userId);

        const unsub = firestoreService.onCollectionChange(
            this.collectionName,
            [{ field: 'userId', operator: '==', value: userId }],
            (docs) => {
                const unread = docs.filter(d => !d.read).length;
                callback(unread);
            }
        );

        this._unsubscribers.set(`unread_${userId}`, unsub);
        return () => this.unsubscribeUnreadCount(userId);
    }

    unsubscribeUnreadCount(userId) {
        const key = `unread_${userId}`;
        if (this._unsubscribers.has(key)) {
            this._unsubscribers.get(key)();
            this._unsubscribers.delete(key);
        }
    }

    /**
     * Mark a single notification as read
     * @param {string} notifId
     */
    async markRead(notifId) {
        await firestoreService.updateDocument(this.collectionName, notifId, { read: true });
    }

    /**
     * Mark all notifications as read for a user
     * @param {string} userId
     */
    async markAllRead(userId) {
        const unread = await firestoreService.queryDocuments(this.collectionName, [
            { field: 'userId', operator: '==', value: userId },
            { field: 'read',   operator: '==', value: false }
        ]);
        await Promise.all(unread.map(n => this.markRead(n.id)));
    }

    /**
     * Cleanup all active listeners (call on page unload)
     */
    cleanup() {
        this._unsubscribers.forEach(unsub => unsub());
        this._unsubscribers.clear();
    }
}

export const notificationService = new NotificationService();

// Cleanup listeners when user navigates away
window.addEventListener('beforeunload', () => notificationService.cleanup());

console.log('✅ Notification Service initialized (with real-time support)');

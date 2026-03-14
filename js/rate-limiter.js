// Rate Limiting Service
// Prevents abuse by limiting API calls per user.
// PRIVACY FIX (VULN-5): Timestamps are now persisted to sessionStorage so
// that a page refresh does NOT reset all counters. window.rateLimiter is no
// longer exported so users cannot call .clear() from the browser console.

class RateLimiter {
    constructor() {
        this.WINDOW_MS = 60000; // 1 minute window
        this.MAX_REQUESTS = {
            createGroup: 5,      // 5 groups per minute
            joinGroup: 10,       // 10 joins per minute
            updateProfile: 10,   // 10 updates per minute
            search: 30,          // 30 searches per minute
            default: 20          // 20 requests per minute for other actions
        };
        this.SESSION_KEY_PREFIX = '_rl_';
    }

    // ── SessionStorage helpers ──────────────────────────────────────────────

    _storageKey(userId, action) {
        return `${this.SESSION_KEY_PREFIX}${userId}:${action}`;
    }

    _getTimestamps(userId, action) {
        try {
            const raw = sessionStorage.getItem(this._storageKey(userId, action));
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    _setTimestamps(userId, action, timestamps) {
        try {
            sessionStorage.setItem(
                this._storageKey(userId, action),
                JSON.stringify(timestamps)
            );
        } catch {
            // sessionStorage full—fail open (don't block the user)
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Check if action is allowed for a user.
     * @param {string} userId
     * @param {string} action
     * @returns {boolean}
     */
    checkLimit(userId, action = 'default') {
        const now = Date.now();
        const timestamps = this._getTimestamps(userId, action);

        // Remove timestamps outside the 1-minute window
        const valid = timestamps.filter(t => now - t < this.WINDOW_MS);

        const maxRequests = this.MAX_REQUESTS[action] || this.MAX_REQUESTS.default;

        if (valid.length >= maxRequests) {
            console.warn(`⚠️ Rate limit exceeded for ${action} by user ${userId}`);
            return false;
        }

        // Record this request
        valid.push(now);
        this._setTimestamps(userId, action, valid);
        return true;
    }

    /**
     * Get remaining requests for action.
     * @param {string} userId
     * @param {string} action
     * @returns {number}
     */
    getRemaining(userId, action = 'default') {
        const now = Date.now();
        const timestamps = this._getTimestamps(userId, action);
        const valid = timestamps.filter(t => now - t < this.WINDOW_MS);
        const maxRequests = this.MAX_REQUESTS[action] || this.MAX_REQUESTS.default;
        return Math.max(0, maxRequests - valid.length);
    }

    /**
     * Clear all rate-limit data for a specific user (e.g., on logout).
     * @param {string} userId
     */
    clearUser(userId) {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith(`${this.SESSION_KEY_PREFIX}${userId}:`)) {
                sessionStorage.removeItem(key);
            }
        }
    }
}

// Create singleton instance — NOT exported to window (VULN-5 fix)
export const rateLimiter = new RateLimiter();

export { RateLimiter };

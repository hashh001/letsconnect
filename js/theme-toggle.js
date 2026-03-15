/**
 * theme-toggle.js — Dark / Light mode toggle
 * Persists preference in localStorage.
 * Sets data-theme="light" on <html> for light mode; dark is default (no attribute).
 */

const STORAGE_KEY = 'lc_theme';
const DARK  = 'dark';
const LIGHT = 'light';

/** Returns 'light' or 'dark' */
function getPreferred() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === LIGHT || stored === DARK) return stored;
    // Respect OS preference as default
    return window.matchMedia('(prefers-color-scheme: light)').matches ? LIGHT : DARK;
}

/** Apply theme to <html> element */
function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === LIGHT) {
        html.setAttribute('data-theme', 'light');
    } else {
        html.removeAttribute('data-theme');
    }
}

/** Toggle and persist */
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? LIGHT : DARK;
    const next = current === DARK ? LIGHT : DARK;
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    updateAllButtons(next);
}

/** Update aria-label + icon on all theme-toggle buttons on the page */
function updateAllButtons(theme) {
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        const isDark = theme === DARK;
        btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        btn.setAttribute('title',      isDark ? 'Switch to light mode' : 'Switch to dark mode');
        btn.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
    });
}

// ── Run immediately so no flash of wrong theme ──
const preferred = getPreferred();
applyTheme(preferred);

// ── Wire buttons once DOM is ready ──
document.addEventListener('DOMContentLoaded', () => {
    // Build the button if the placeholder div exists
    document.querySelectorAll('[data-theme-toggle]').forEach(placeholder => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-ghost btn-sm theme-toggle-btn';
        btn.style.cssText = 'width:40px; height:40px; min-height:40px; padding:0; border-radius:var(--radius-md); font-size:18px; display:flex; align-items:center; justify-content:center; border:1px solid var(--glass-border);';
        btn.innerHTML = '<span class="theme-icon"></span>';
        btn.addEventListener('click', toggleTheme);
        placeholder.replaceWith(btn);
    });

    // Also wire any btn already in the DOM with the class
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        if (!btn.dataset.wired) {
            btn.addEventListener('click', toggleTheme);
            btn.dataset.wired = '1';
        }
    });

    updateAllButtons(preferred);
});

export { toggleTheme, applyTheme, getPreferred };

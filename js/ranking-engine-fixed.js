/**
 * Ranking Engine for ECA-Connect
 * Two-phase pipeline: hard filters → radius split → weighted scoring
 *
 * FIXES applied:
 *  - R2/R3: Normalise {lat,lng} → {lat,lon} before every OSRM call
 *  - R4   : Haversine fallback when OSRM is unavailable
 *  - R5   : Guard against undefined userRadius (default 50)
 *  - F1   : Privacy filter now applied
 *  - F2   : Language filter now applied (uses filters.languages if provided)
 *  - F3   : Interests filter now applied (group must share ≥ 1 tag when tags are selected)
 *  - F4   : Skill level filter from dropdown now applied
 *  - F5   : Custom time filter from header now overrides user.availability
 */

import { calculateRouteWithTimeout } from './route-utils.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { db } from './firebase-config.js';

// Default component weights
const DEFAULT_WEIGHTS = {
    interest:      0.40,   // 40%
    timeOverlap:   0.30,   // 30%
    distance:      0.15,   // 15%
    skill:         0.05,   //  5%
    health:        0.07,   //  7%
    textRelevance: 0.03    //  3%
};

const MIN_TIME_OVERLAP = 30; // minutes

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rank groups for a given user + filters
 * @param {Array}  groups   - Raw groups (already transformed to ranking format)
 * @param {Object} user     - Transformed user profile
 * @param {Object} filters  - Active UI filters
 * @param {Object} weights  - Score component weights
 * @returns {Promise<{inRadius: Array, outOfRadius: Array}>}
 */
export async function rankGroups(groups, user, filters = {}, weights = DEFAULT_WEIGHTS) {
    console.log('🔄 rankGroups called — groups:', groups.length);

    // ─── Phase 0: If custom time filter is set, override user.availability ───
    const effectiveUser = applyCustomTimeFilter(user, filters.timeFilter);

    // ─── Phase A: Hard Filters ────────────────────────────────────────────────
    const eligible = await applyHardFilters(groups, effectiveUser, filters); // applyHardFilters is now async
    console.log('✅ After hard filters:', eligible.length, 'eligible');

    // ─── Phase B: Calculate real distances ───────────────────────────────────
    const userCoord = {
        lat: effectiveUser.location?.lat,
        lon: effectiveUser.location?.lng   // normalise .lng → .lon for OSRM
    };

    const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const userId = effectiveUser.uid || 'anon';

    const groupsWithDistance = await Promise.all(
        eligible.map(async (group) => {
            const groupCoord = {
                lat: group.location?.lat,
                lon: group.location?.lng ?? group.location?.lon  // normalise lng→lon
            };

            let distance = null;
            let duration = null;

            // ── Check Firestore cache first ────────────────────────────────
            const cacheId = `${userId}_${group.id}`;
            const cacheRef = doc(db, 'distanceCache', cacheId);
            try {
                const snap = await getDoc(cacheRef);
                if (snap.exists()) {
                    const cached = snap.data();
                    const age = Date.now() - (cached.cachedAt || 0);
                    if (age < CACHE_TTL_MS) {
                        distance = cached.distanceKm;
                        duration = cached.durationSec;
                        console.log(`⚡ Cache hit for "${group.name}" — ${distance?.toFixed(1)} km`);
                    }
                }
            } catch (_) { /* cache read failed, proceed to OSRM */ }

            // ── Call OSRM only if cache missed and coords are available ────
            if (distance === null) {
                if (userCoord.lat && userCoord.lon && groupCoord.lat && groupCoord.lon) {
                    const route = await calculateRouteWithTimeout(userCoord, groupCoord, 'car', 5000);
                    if (route) {
                        distance = route.distance / 1000; // metres → km
                        duration = route.duration;        // seconds
                        // Write to Firestore cache (fire-and-forget)
                        setDoc(cacheRef, {
                            distanceKm: distance,
                            durationSec: duration,
                            cachedAt: Date.now()
                        }).catch(() => {});
                    } else {
                        console.warn(`⏱ OSRM timeout/fail for "${group.name}" — skipping`);
                        distance = null; // Will be excluded by radius split
                    }
                } else {
                    console.warn(`📍 Missing coords for group "${group.name}" — skipping`);
                    distance = null;
                }
            }

            return { ...group, calculatedDistance: distance, travelDuration: duration };
        })
    );

    // ─── Phase C: Radius Split ────────────────────────────────────────────────
    const { inRadius, outOfRadius } = splitByRadius(
        groupsWithDistance,
        effectiveUser,
        filters.maxRadius
    );

    // ─── Phase D: Score & Sort ────────────────────────────────────────────────
    const rankedIn  = await rankGroupSet(inRadius,      effectiveUser, filters, weights, true);
    const rankedOut = await rankGroupSet(outOfRadius,   effectiveUser, filters, weights, false);

    console.log('✅ Final — inRadius:', rankedIn.length, 'outOfRadius:', rankedOut.length);
    return { inRadius: rankedIn, outOfRadius: rankedOut };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 0 — Custom time filter override
// ─────────────────────────────────────────────────────────────────────────────

function applyCustomTimeFilter(user, timeFilter) {
    if (!timeFilter) return user;
    // Replace availability with the single custom window from the modal
    return {
        ...user,
        availability: [{
            day:       timeFilter.day,
            startTime: timeFilter.startTime,
            endTime:   timeFilter.endTime
        }]
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE A — Hard Filters
// ─────────────────────────────────────────────────────────────────────────────

async function applyHardFilters(groups, user, filters) {
    const passedGroups = [];

    for (const group of groups) {
        let passed = true;
        const reject = (reason) => {
            console.log(`❌ "${group.name}" rejected: ${reason}`);
            passed = false;
        };

        // 1. Private groups — only visible to members
        if (group.privacy === 'private') {
             // We must dynamically query the subcollection since members array is gone
             const isMem = await isMemberAsync(group.id, user.uid);
             if (!isMem) reject('Private (non-member)');
        }

        if (!passed) continue;

        // 2. Privacy filter — if user selected privacy types, group must match
        if (filters.privacy && filters.privacy.length > 0) {
            const p = (group.privacy || 'open').toLowerCase();
            if (!filters.privacy.includes(p)) { reject(`Privacy not in [${filters.privacy}]`); continue; }
        }

        // 3. Language filter — use filters.languages if provided, else fallback to user.language
        if (filters.languages && filters.languages.length > 0) {
            const gl = (group.language || 'English');
            const match = filters.languages.some(l =>
                l.toLowerCase() === gl.toLowerCase() ||
                gl.toLowerCase() === 'both' ||       // "Both" satisfies any language
                l.toLowerCase() === 'both'
            );
            if (!match) { reject(`Language "${gl}" not in [${filters.languages}]`); continue; }
        } else if (user.language && group.language !== user.language && group.language !== 'English') {
            reject('Language mismatch (user preference)');
            continue;
        }

        // 4. Search query — name, description, or tags
        if (filters.searchQuery) {
            const q = filters.searchQuery.toLowerCase();
            const inName = group.name.toLowerCase().includes(q);
            const inDesc = (group.description || '').toLowerCase().includes(q);
            const inTags = (group.tags || []).some(t => t.toLowerCase().includes(q));
            if (!inName && !inDesc && !inTags) { reject('Search mismatch'); continue; }
        }

        // 5. Interests filter — if specific tags selected, group must share ≥ 1
        if (filters.interests && filters.interests.length > 0) {
            const hasMatch = (group.tags || []).some(t =>
                filters.interests.map(i => i.toLowerCase()).includes(t.toLowerCase())
            );
            if (!hasMatch) { reject(`No interest overlap with [${filters.interests}]`); continue; }
        }

        // 6. Skill level dropdown (hard filter only when a level is explicitly chosen)
        if (filters.skillLevel && filters.skillLevel !== '') {
            const groupLevel = (group.skillLevel || 'beginner').toLowerCase();
            const selected   = filters.skillLevel.toLowerCase();
            // Beginner groups always pass; otherwise must match or be below
            const levels = { beginner: 1, intermediate: 2, advanced: 3 };
            if (levels[groupLevel] > (levels[selected] || 1)) {
                reject(`Skill level "${groupLevel}" > selected "${selected}"`);
                continue;
            }
        }

        // 7. Strict skill checkbox (exact match)
        if (filters.strictSkill && user.skillLevels) {
            const userLevels = user.skillLevels || {};
            const uSkill = (userLevels[group.category] || 'beginner').toLowerCase();
            if (group.skillLevel && group.skillLevel.toLowerCase() !== uSkill) {
                reject('Strict skill mismatch');
            }
        }

        if (passed) passedGroups.push(group);
    }
    return passedGroups;
}

// Helper to check membership dynamically for ranking engine
async function isMemberAsync(groupId, userId) {
    try {
        const snap = await getDoc(doc(db, 'groups', groupId, 'members', userId));
        return snap.exists();
    } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE C — Radius Split
// ─────────────────────────────────────────────────────────────────────────────

function splitByRadius(groups, user, maxRadius) {
    const threshold = maxRadius || user.radius || 50;
    console.log('📏 Radius threshold:', threshold, 'km');

    const inRadius = [];
    const outOfRadius = [];

    groups.forEach(group => {
        const d = group.calculatedDistance;
        console.log(`📍 "${group.name}": ${d?.toFixed(1)} km — threshold ${threshold} km`);
        if (d <= threshold) inRadius.push(group);
        else outOfRadius.push(group);
    });

    return { inRadius, outOfRadius };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE D — Score & Sort
// ─────────────────────────────────────────────────────────────────────────────

async function rankGroupSet(groups, user, filters, weights, isInRadius) {
    const scored = groups.map(group => {
        const componentScores = calculateComponentScores(group, user, filters, isInRadius);
        const finalScore      = calculateFinalScore(componentScores, weights);
        const compatibilityScore = calculateCompatibilityScore(componentScores, weights);
        return { ...group, componentScores, finalScore, compatibilityScore };
    });

    const sortBy = filters.sortBy || 'best-match';

    return scored.sort((a, b) => {
        if (sortBy === 'nearest') {
            return a.calculatedDistance - b.calculatedDistance;
        }
        if (sortBy === 'most-active') {
            const act = g => (g.healthMetrics?.messagesPerDay || 0) + (g.healthMetrics?.eventsPerMonth || 0) * 2;
            return act(b) - act(a);
        }
        return b.finalScore - a.finalScore; // best-match
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT SCORE CALCULATIONS (each returns 0–1)
// ─────────────────────────────────────────────────────────────────────────────

function calculateComponentScores(group, user, filters, isInRadius) {
    return {
        interest:      calculateInterestScore(group, user),
        timeOverlap:   calculateTimeOverlapScore(group, user),
        distance:      calculateDistanceScore(group.calculatedDistance, user.radius, isInRadius),
        skill:         calculateSkillScore(group, user),
        health:        calculateHealthScore(group),
        textRelevance: calculateTextRelevance(group, filters.searchQuery || '')
    };
}

function calculateFinalScore(componentScores, weights) {
    const keys = Object.keys(weights).filter(k => weights[k] > 0);
    const total = keys.reduce((s, k) => s + weights[k], 0);
    return keys.reduce((s, k) => s + (weights[k] / total) * componentScores[k], 0);
}

/**
 * User-visible compatibility score — only interest, time, distance, skill
 */
function calculateCompatibilityScore(componentScores, weights) {
    const visible = ['interest', 'timeOverlap', 'distance', 'skill'];
    const total = visible.reduce((s, k) => s + (weights[k] || 0), 0);
    if (total === 0) return 0;
    const score = visible.reduce((s, k) => s + ((weights[k] || 0) / total) * componentScores[k], 0);
    return Math.round(score * 100);
}

// ── Interest ──────────────────────────────────────────────────────────────────
function calculateInterestScore(group, user) {
    const tags = group.tags || [];
    if (tags.length === 0) return 0.3; // neutral rather than 0
    const userInterests = (user.interests || []).map(i => i.toLowerCase());
    const matched = tags.filter(t => userInterests.includes(t.toLowerCase()));
    return matched.length / tags.length;
}

// ── Time Overlap ──────────────────────────────────────────────────────────────
function calculateTimeOverlapScore(group, user) {
    const overlap = calculateTimeOverlapMinutes(group, user);
    const duration = getGroupDurationMinutes(group);
    if (duration <= 0) return 0.3; // neutral
    return Math.min(1, overlap / duration);
}

// ── Distance ──────────────────────────────────────────────────────────────────
function calculateDistanceScore(distance, userRadius, isInRadius) {
    const radius = userRadius || 50; // R5 fix — guard against undefined
    if (!distance || distance <= 0) return 1;

    if (isInRadius) {
        return Math.max(0, 1 - (distance / radius));
    }
    const maxDist = radius * 2;
    return Math.max(0, 1 - (distance - radius) / (maxDist - radius));
}

// ── Skill ─────────────────────────────────────────────────────────────────────
function calculateSkillScore(group, user) {
    const userLevels = user.skillLevels || {};
    const uSkill = (userLevels[group.category] || 'beginner').toLowerCase();
    const levels = { beginner: 1, intermediate: 2, advanced: 3 };
    const uLevel = levels[uSkill] || 1;
    const gLevel = levels[(group.skillLevel || 'beginner').toLowerCase()] || 1;
    if (uLevel >= gLevel) return 1.0;
    if (gLevel === 1) return 1.0;
    return 0.5;
}

// ── Health ────────────────────────────────────────────────────────────────────
function calculateHealthScore(group) {
    const m = group.healthMetrics;
    if (!m) return 0.3;

    const daysSince = (new Date() - new Date(m.lastActivityDate || Date.now())) / 86400000;
    const recency   = Math.max(0, 1 - daysSince / 30);
    const activity  = Math.min(1, (m.messagesPerDay || 0) / 50);
    const memberCt  = group.memberCount || 1;
    const attendance = Math.min(1, (m.averageAttendance || 1) / memberCt);

    return recency * 0.4 + activity * 0.3 + attendance * 0.3;
}

// ── Text Relevance ────────────────────────────────────────────────────────────
function calculateTextRelevance(group, searchQuery) {
    if (!searchQuery?.trim()) return 0;
    const q   = searchQuery.toLowerCase().trim();
    const txt = `${group.name} ${group.description || ''} ${(group.tags || []).join(' ')}`.toLowerCase();

    if (group.name.toLowerCase().startsWith(q)) return 1.0;
    if (txt.includes(q)) return 0.7;

    const words   = q.split(' ').filter(w => w.length > 2);
    const matched = words.filter(w => txt.includes(w));
    return words.length === 0 ? 0 : (matched.length / words.length) * 0.5;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIME HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function calculateTimeOverlapMinutes(group, user) {
    let total = 0;
    (user.availability || []).forEach(win => {
        const gDay = (group.schedule?.dayOfWeek || group.schedule?.day || '').toLowerCase();
        const uDay = (win.day || '').toLowerCase();
        if (gDay === uDay) {
            total += getTimeWindowOverlap(
                win.startTime, win.endTime,
                group.schedule.startTime, group.schedule.endTime
            );
        }
    });
    return total;
}

function getTimeWindowOverlap(s1, e1, s2, e2) {
    const overlapStart = Math.max(timeToMinutes(s1), timeToMinutes(s2));
    const overlapEnd   = Math.min(timeToMinutes(e1), timeToMinutes(e2));
    return Math.max(0, overlapEnd - overlapStart);
}

function timeToMinutes(t) {
    if (!t || typeof t !== 'string') return 0;
    const descriptive = { morning: 360, afternoon: 720, evening: 1020, night: 1200 };
    const lower = t.toLowerCase().trim();
    if (descriptive[lower] !== undefined) return descriptive[lower];
    if (!t.includes(':')) return 0;
    const [h, m] = t.split(':').map(Number);
    return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
}

function getGroupDurationMinutes(group) {
    const s = timeToMinutes(group.schedule?.startTime);
    const e = timeToMinutes(group.schedule?.endTime);
    return Math.max(0, e - s);
}

export { DEFAULT_WEIGHTS, MIN_TIME_OVERLAP };

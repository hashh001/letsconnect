/**
 * Simplified Dashboard Integration - Debug Version
 */

import { currentUser, mockGroups } from './mock-data.js';
import { rankGroups, DEFAULT_WEIGHTS } from './ranking-engine.js?v=2';

console.log('📦 Dashboard integration module loaded');
console.log('👤 Current user:', currentUser.name);
console.log('📊 Total groups:', mockGroups.length);

export async function initDashboardFilters() {
    console.log('🎯 === STARTING DASHBOARD INITIALIZATION ===');

    try {
        // 1. Initial Render (No filters)
        await updateDashboard();

        // 2. Bind Event Listeners
        bindFilterEvents();

        // 3. Populate Interest Tags (Dynamic from Mock Data)
        populateInterestTags();

        console.log('✅ === DASHBOARD INITIALIZATION COMPLETE ===');

    } catch (error) {
        console.error('❌ === ERROR IN DASHBOARD INITIALIZATION ===');
        console.error(error);
        showErrorState(error);
    }
}

// --- Binder Functions ---

function bindFilterEvents() {
    // Search Input (Debounced)
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                console.log('🔍 Search changed:', searchInput.value);
                updateDashboard();
            }, 300);
        });
    }

    // Checkboxes (Immediate)
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            console.log('☑️ Checkbox changed:', cb.id || cb.value);
            updateDashboard();
        });
    });

    // Selects (Immediate)
    const selects = document.querySelectorAll('select');
    selects.forEach(sel => {
        sel.addEventListener('change', () => {
            console.log('🔽 Select changed:', sel.id);
            updateDashboard();
        });
    });

    // Reset Button
    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetFilters);
    }
}

function populateInterestTags() {
    const container = document.getElementById('interest-tags');
    if (!container) return;

    // Extract unique tags from mockGroups
    const allTags = new Set();
    mockGroups.forEach(g => g.tags.forEach(t => allTags.add(t)));

    container.innerHTML = '';
    allTags.forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'interest-tag'; // Defined in dashboard.css/html styles
        chip.textContent = tag;
        chip.onclick = () => {
            chip.classList.toggle('active');
            updateDashboard();
        };
        container.appendChild(chip);
    });
}

// --- Core Logic ---

async function updateDashboard() {
    const loadingEl = document.getElementById('loading-state');
    if (loadingEl) loadingEl.style.display = 'block';

    try {
        // 1. Collect Filters
        const filters = collectFilters();

        // 2. Rank
        const results = await rankGroups(mockGroups, currentUser, filters, DEFAULT_WEIGHTS);

        // 3. Render
        renderGroups(results.inRadius, results.outOfRadius);

        // 4. Update UI Context (Active Chips, etc.)
        updateActiveFilterChips(filters);

    } catch (error) {
        console.error('Error updating dashboard:', error);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

function collectFilters() {
    const filters = {
        searchQuery: getVal('filter-search'),
        onlyInRadius: getChecked('only-in-radius'),
        requireTimeMatch: getChecked('require-time-match'),
        strictSkill: getChecked('strict-skill'),
        privacy: getCheckedValues('.privacy-filter'),
        languages: getCheckedValues('.language-filter'),
        interests: getActiveTags()
    };
    return filters;
}

function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function getChecked(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
}

function getCheckedValues(selector) {
    return Array.from(document.querySelectorAll(`${selector}:checked`)).map(cb => cb.value);
}

function getActiveTags() {
    return Array.from(document.querySelectorAll('.interest-tag.active')).map(el => el.textContent);
}

function resetFilters() {
    // Reset Inputs
    document.getElementById('filter-search').value = '';
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = cb.defaultChecked || false);
    document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
    document.querySelectorAll('.interest-tag').forEach(t => t.classList.remove('active'));

    // Trigger Update
    updateDashboard();
}

function updateActiveFilterChips(filters) {
    const container = document.getElementById('active-filters');
    if (!container) return;
    container.innerHTML = '';

    // Helper to add chip
    const addChip = (text, onClick) => {
        const chip = document.createElement('div');
        chip.className = 'filter-chip'; // From dashboard styles
        chip.innerHTML = `<span>${text}</span> <button>×</button>`;
        chip.querySelector('button').onclick = onClick;
        container.appendChild(chip);
    };

    if (filters.searchQuery) addChip(`Search: "${filters.searchQuery}"`, () => {
        document.getElementById('filter-search').value = '';
        updateDashboard();
    });

    if (filters.onlyInRadius) addChip('Only 5km', () => {
        document.getElementById('only-in-radius').checked = false;
        updateDashboard();
    });

    // Add more chips as needed...
}

function showErrorState(error) {
    const loadingEl = document.getElementById('loading-state');
    if (loadingEl) {
        loadingEl.innerHTML = `<div style="color:red">Error: ${error.message}</div>`;
    }
}

function renderGroups(inRadius, outOfRadius) {
    console.log('🎨 Rendering groups...');

    const inRadiusContainer = document.getElementById('in-radius-groups');
    const outRadiusContainer = document.getElementById('out-radius-groups');
    const inRadiusSection = document.getElementById('in-radius-section');
    const outRadiusSection = document.getElementById('out-radius-section');
    const noResults = document.getElementById('no-results');

    // Update counts
    const inRadiusCount = document.getElementById('in-radius-count');
    const outRadiusCount = document.getElementById('out-radius-count');
    const totalCount = document.getElementById('total-results-count');

    if (inRadiusCount) inRadiusCount.textContent = inRadius.length;
    if (outRadiusCount) outRadiusCount.textContent = outOfRadius.length;
    if (totalCount) totalCount.textContent = inRadius.length + outOfRadius.length;

    // Check if TOTAL no results
    if (inRadius.length === 0 && outOfRadius.length === 0) {
        console.log('⚠️ No results found');
        if (noResults) noResults.style.display = 'block';
        if (inRadiusSection) inRadiusSection.style.display = 'none';
        if (outRadiusSection) outRadiusSection.style.display = 'none';
        return;
    }

    // Hide "No Results" state if we have results
    if (noResults) noResults.style.display = 'none';

    // --- Render In-Radius ---
    if (inRadiusSection) {
        if (inRadius.length > 0) {
            inRadiusSection.style.display = 'block';
            if (inRadiusContainer) {
                inRadiusContainer.innerHTML = '';
                inRadius.forEach(group => {
                    const card = createGroupCard(group);
                    inRadiusContainer.appendChild(card);
                });
            }
        } else {
            // Explicitly hide if empty
            inRadiusSection.style.display = 'none';
            if (inRadiusContainer) inRadiusContainer.innerHTML = '';
        }
    }

    // --- Render Out-of-Radius ---
    if (outRadiusSection) {
        if (outOfRadius.length > 0) {
            outRadiusSection.style.display = 'block';
            if (outRadiusContainer) {
                outRadiusContainer.style.display = 'grid';
                outRadiusContainer.innerHTML = '';
                outOfRadius.forEach(group => {
                    const card = createGroupCard(group);
                    outRadiusContainer.appendChild(card);
                });
            }
        } else {
            // Explicitly hide if empty
            outRadiusSection.style.display = 'none';
            if (outRadiusContainer) outRadiusContainer.innerHTML = '';
        }
    }

    console.log('✅ Rendering complete!');
}

function createGroupCard(group) {
    const card = document.createElement('div');
    card.className = 'card-minimal';
    card.style.cursor = 'pointer';
    card.onclick = () => {
        window.location.href = `group-details.html?id=${group.id}`;
    };

    const isActive = group.componentScores && group.componentScores.health > 0.7;

    card.innerHTML = `
        <div class="card-minimal-header" style="background-image: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url('https://placehold.co/400x200/${group.imageColor.replace('#', '')}/ffffff?text=${encodeURIComponent(group.name)}');">
            ${isActive ? '<div class="status-badge">✨ Active</div>' : ''}
        </div>
        <div class="card-minimal-body">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h4 class="card-title">${group.name}</h4>
                <div style="font-size: 11px; color: var(--primary-500); font-weight: 700; background: var(--primary-50); padding: 2px 6px; border-radius: 4px;">
                    ${group.compatibilityScore}% Match
                </div>
            </div>
            
            <p class="card-description">${group.description}</p>
            
            <div class="info-row">
                <div class="info-item">
                    <span>📍</span> ${group.calculatedDistance.toFixed(1)} km
                </div>
                <div class="info-item">
                    <span>👥</span> ${group.members}
                </div>
            </div>
        </div>
    `;

    return card;
}

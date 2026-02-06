/**
 * Quick test for ranking engine
 * Run this in browser console to test ranking
 */

import { currentUser, mockGroups } from './mock-data.js';
import { rankGroups, DEFAULT_WEIGHTS } from './ranking-engine.js';

async function testRankingEngine() {
    console.log('🧪 Testing Ranking Engine...\n');

    // Test 1: No filters (default)
    console.log('Test 1: No filters, default radius (5km)');
    const result1 = await rankGroups(mockGroups, currentUser, {}, DEFAULT_WEIGHTS);
    console.log(`In-radius: ${result1.inRadius.length} groups`);
    result1.inRadius.forEach(g => {
        console.log(`  - ${g.name}: ${g.compatibilityScore}% compat, ${g.finalScore.toFixed(2)} score, ${g.calculatedDistance.toFixed(1)}km`);
    });
    console.log(`Out-of-radius: ${result1.outOfRadius.length} groups`);
    result1.outOfRadius.forEach(g => {
        console.log(`  - ${g.name}: ${g.compatibilityScore}% compat, ${g.finalScore.toFixed(2)} score, ${g.calculatedDistance.toFixed(1)}km`);
    });

    // Test 2: Interest filter
    console.log('\nTest 2: Filter by Badminton interest');
    const result2 = await rankGroups(mockGroups, currentUser, {
        interests: ['Badminton']
    }, DEFAULT_WEIGHTS);
    console.log(`Matching groups: ${result2.inRadius.length + result2.outOfRadius.length}`);
    [...result2.inRadius, ...result2.outOfRadius].forEach(g => {
        console.log(`  - ${g.name}: ${g.tags.join(', ')}`);
    });

    // Test 3: Time overlap filter
    console.log('\nTest 3: Require time overlap (Saturday 6-9 PM)');
    const result3 = await rankGroups(mockGroups, currentUser, {
        requireTimeMatch: true
    }, DEFAULT_WEIGHTS);
    console.log(`Matching groups: ${result3.inRadius.length + result3.outOfRadius.length}`);
    [...result3.inRadius, ...result3.outOfRadius].forEach(g => {
        console.log(`  - ${g.name}: ${g.schedule.dayOfWeek} ${g.schedule.startTime}-${g.schedule.endTime}, overlap: ${g.componentScores.timeOverlap.toFixed(2)}`);
    });

    console.log('\n✅ Tests complete!');
    return { result1, result2, result3 };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    window.testRankingEngine = testRankingEngine;
    console.log('💡 Run testRankingEngine() in console to test');
}

export { testRankingEngine };

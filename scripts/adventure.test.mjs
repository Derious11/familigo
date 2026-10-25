import assert from 'node:assert/strict';
import test from 'node:test';
import { activityPoints, adventureWeek, standings, suggestedTarget, trailPosition, TRAIL_POINTS } from '../src/lib/adventure.mjs';
import { ADVENTURE_THEMES, getAdventureTheme } from '../src/lib/adventureThemes.mjs';

test('UTC weeks cross month/year boundaries and roll over on Monday', () => {
    assert.equal(adventureWeek(new Date('2027-01-03T23:59:59Z')).id, '2026-12-28');
    const week = adventureWeek(new Date('2027-01-04T00:00:00Z'));
    assert.equal(week.id, '2027-01-04');
    assert.equal(week.end.toISOString(), '2027-01-11T00:00:00.000Z');
});
const week = adventureWeek(new Date('2026-10-15T12:00:00Z'));
test('points include start, exclude next week, ignore streak and invalid counts', () => {
    assert.equal(activityPoints({ streak: 99, activityMap: { '2026-10-11': 9, '2026-10-12': 2, '2026-10-18': 3, '2026-10-19': 99, '2026-10-13': -3, '2026-10-14': '8' } }, week.start, week.end), 5);
    assert.equal(activityPoints({ streak: 99 }, week.start, week.end), 0);
});
test('ties share rank, including everyone at zero', () => {
    const entries = standings([{ id: 'b', activityMap: { [week.id]: 3 } }, { id: 'c', activityMap: {} }, { id: 'a', activityMap: { [week.id]: 3 } }], week.start, week.end);
    assert.deepEqual(entries.map(member => [member.id, member.rank]), [['a', 1], ['b', 1], ['c', 3]]);
});
test('suggestion uses only completed recorded weeks and has an achievable starter', () => {
    assert.equal(suggestedTarget([{}, {}, {}, {}], week.start), 56);
    assert.equal(suggestedTarget([{ activityMap: { '2026-10-05': 10, '2026-09-28': 30, [week.id]: 1000 } }], week.start), 22);
    assert.equal(suggestedTarget([], week.start), 14);
    assert.equal(suggestedTarget([{ activityMap: { '2026-10-05': 1000000 } }], week.start), 100000);
});
test('one shared route interpolates by distance and caps at endpoints', () => {
    assert.equal(ADVENTURE_THEMES.length, 4);
    assert.equal(new Set(ADVENTURE_THEMES.map(theme => theme.image)).size, 4);
    const start = TRAIL_POINTS[0], finish = TRAIL_POINTS.at(-1);
    assert.deepEqual(trailPosition(0, 10), { x: start[0] / 1536 * 100, y: start[1] / 1024 * 100 });
    const end = trailPosition(10, 10);
    assert.ok(Math.abs(end.x - finish[0] / 1536 * 100) < 1e-8);
    assert.ok(Math.abs(end.y - finish[1] / 1024 * 100) < 1e-8);
    assert.deepEqual(end, trailPosition(50, 10));
    assert.deepEqual(trailPosition(-2, 10), trailPosition(0, 10));
    for (let points = 0; points <= 100; points++) {
        const p = trailPosition(points, 100);
        assert.ok(p.x > 0 && p.x < 100 && p.y > 0 && p.y < 100);
    }
    assert.equal(getAdventureTheme('unknown').id, 'mountain');
});

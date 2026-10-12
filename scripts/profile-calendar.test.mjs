import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActivityCalendar } from '../src/lib/activityCalendar.mjs';

test('October displays every date and starts in the Thursday column', () => {
    const calendar = buildActivityCalendar(new Date(2026, 9, 11, 18));
    assert.equal(calendar.leadingDays, 4);
    assert.equal(calendar.days.length, 31);
    assert.deepEqual(calendar.days.map(day => day.day), Array.from({ length: 31 }, (_, index) => index + 1));
    assert.equal(calendar.days[0].key, '2026-10-01');
    assert.equal(calendar.days.at(-1).key, '2026-10-31');
    assert.equal(calendar.days.filter(day => day.isToday).length, 1);
    assert.equal(calendar.days[10].isToday, true);
    assert.equal(calendar.days[11].isFuture, true);
});

test('February includes leap day only in leap years', () => {
    assert.equal(buildActivityCalendar(new Date(2024, 1, 15)).days.length, 29);
    assert.equal(buildActivityCalendar(new Date(2026, 1, 15)).days.length, 28);
});

test('month starting on Sunday needs no leading blanks; Saturday needs six', () => {
    assert.equal(buildActivityCalendar(new Date(2026, 1, 1)).leadingDays, 0);
    assert.equal(buildActivityCalendar(new Date(2026, 7, 1)).leadingDays, 6);
});

test('all months have sequential unique keys with correct first and last days', () => {
    for (const year of [2024, 2026]) {
        for (let month = 0; month < 12; month++) {
            const { days } = buildActivityCalendar(new Date(year, month, 15));
            assert.equal(days.length, new Date(year, month + 1, 0).getDate());
            assert.equal(new Set(days.map(day => day.key)).size, days.length);
            assert.equal(days[0].day, 1);
            assert.equal(days.at(-1).day, days.length);
        }
    }
});

test('late evening in Phoenix retains local month and day labels', () => {
    const originalTimezone = process.env.TZ;
    try {
        process.env.TZ = 'America/Phoenix';
        const { days } = buildActivityCalendar(new Date('2026-11-01T01:00:00Z'));
        assert.equal(days.length, 31);
        assert.equal(days.at(-1).key, '2026-10-31');
        assert.equal(days.at(-1).isToday, true);
        assert.equal(days[0].label, new Date(2026, 9, 1).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
    } finally {
        if (originalTimezone === undefined) delete process.env.TZ;
        else process.env.TZ = originalTimezone;
    }
});

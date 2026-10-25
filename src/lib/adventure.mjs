// Existing activityMap keys are UTC dates. Use the same calendar for every family member.
const DAY = 86400000;
export function adventureWeek(now = new Date()) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    return { id: start.toISOString().slice(0, 10), start, end: new Date(+start + 7 * DAY) };
}
export function activityPoints(member, start, end) {
    let total = 0;
    for (let at = +start; at < +end; at += DAY) {
        const value = member.activityMap?.[new Date(at).toISOString().slice(0, 10)];
        if (Number.isFinite(value) && value > 0) total += Math.floor(value);
    }
    return total;
}
export function suggestedTarget(members, start) {
    const weeks = Array.from({ length: 4 }, (_, index) => members.reduce((sum, member) => sum + activityPoints(member, new Date(+start - (index + 1) * 7 * DAY), new Date(+start - index * 7 * DAY)), 0));
    // Ignore weeks without records rather than treating missing history as inactivity.
    const recorded = weeks.filter(value => value > 0);
    return Math.min(100000, recorded.length ? Math.max(7, Math.ceil(recorded.reduce((a, b) => a + b, 0) / recorded.length * 1.1)) : Math.max(1, members.length) * 14);
}
export function standings(members, start, end) {
    const sorted = members.map(member => ({ ...member, weeklyScore: activityPoints(member, start, end) })).sort((a, b) => b.weeklyScore - a.weeklyScore || a.id.localeCompare(b.id));
    return sorted.map((member, index) => ({ ...member, rank: sorted.findIndex(other => other.weeklyScore === member.weeklyScore) + 1 }));
}
// One standard path for every theme, in the shared 1536×1024 artboard.
export const TRAIL_POINTS = [[190,820],[300,815],[430,810],[550,770],[625,710],[650,664],[715,638],[830,625],[960,630],[1055,610],[1100,567],[1095,530],[1030,497],[986,465],[1002,435],[1080,414],[1200,394],[1260,367],[1278,339],[1250,312],[1203,292],[1180,269],[1203,248],[1270,229],[1335,206],[1355,180],[1350,155],[1365,147]];
const trailDistances = [0];
TRAIL_POINTS.forEach((point, index) => { if (index) trailDistances.push(trailDistances[index - 1] + Math.hypot(point[0] - TRAIL_POINTS[index - 1][0], point[1] - TRAIL_POINTS[index - 1][1])); });
export function trailPosition(points, target) {
    const distance = Math.max(0, Math.min(1, points / Math.max(1, target))) * trailDistances.at(-1);
    const upper = Math.max(1, trailDistances.findIndex(value => value >= distance));
    const lower = upper - 1;
    const part = (distance - trailDistances[lower]) / (trailDistances[upper] - trailDistances[lower]);
    return { x: (TRAIL_POINTS[lower][0] + (TRAIL_POINTS[upper][0] - TRAIL_POINTS[lower][0]) * part) / 1536 * 100, y: (TRAIL_POINTS[lower][1] + (TRAIL_POINTS[upper][1] - TRAIL_POINTS[lower][1]) * part) / 1024 * 100 };
}

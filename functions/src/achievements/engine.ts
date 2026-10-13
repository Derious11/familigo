import {AchievementState, BADGES, emptyState} from "./catalog";
export interface AchievementEvent {
  kind: string;
  at: number;
  category?: string;
}
const DAY = 86400000;
// UTC calendar days and Monday weeks match existing activityMap date keys.
/**
 * Returns the Monday week start for a UTC instant.
 * @param {number} at Epoch milliseconds.
 * @return {string} UTC Monday date.
 */
export function weekKey(at: number): string {
  const date = new Date(at);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
/**
 * Applies one already validated and deduplicated activity event.
 * @param {AchievementState} previous Persisted state, if any.
 * @param {AchievementEvent} event Validated event.
 * @param {boolean} historical Whether to suppress celebrations.
 * @return {object} New state and newly unlocked badge IDs.
 */
export function evaluate(
  previous: AchievementState | undefined,
  event: AchievementEvent,
  historical = false,
): { state: AchievementState; unlocked: string[] } {
  const state: AchievementState = JSON.parse(
    JSON.stringify(previous || emptyState()),
  );
  const bump = (key: string) => {
    state.metrics[key] = (state.metrics[key] || 0) + 1;
  };
  if (event.kind === "completion") {
    bump("completions");
    if (state.lastCompletion && event.at - state.lastCompletion >= 7 * DAY) {
      state.metrics.returned = 1;
    }
    state.lastCompletion = Math.max(state.lastCompletion || 0, event.at);
    if (event.category && !state.categories.includes(event.category)) {
      state.categories.push(event.category);
    }
    state.metrics.categories = state.categories.length;
    const week = weekKey(event.at);
    const day = new Date(event.at).toISOString().slice(0, 10);
    state.weeks[week] = Array.from(
      new Set([...(state.weeks[week] || []), day]),
    );
    const latest = weekKey(state.lastCompletion);
    let consecutive = 0;
    // Keep last week's streak while the current week is still in progress.
    let cursor = Date.parse(latest);
    if ((state.weeks[latest] || []).length < 2) cursor -= 7 * DAY;
    while (
      (state.weeks[new Date(cursor).toISOString().slice(0, 10)] || []).length >=
      2
    ) {
      consecutive++;
      cursor -= 7 * DAY;
    }
    state.metrics.activeWeeks = Math.min(4, consecutive);
    state.metrics.weekDays = (state.weeks[latest] || []).length;
    // Retain only the weeks needed for the largest streak.
    for (const key of Object.keys(state.weeks)) {
      if (Date.parse(key) < Date.parse(latest) - 35 * DAY) {
        delete state.weeks[key];
      }
    }
  } else if (event.kind === "legacyCompletion") {
    bump("completions");
    if (event.category && !state.categories.includes(event.category)) {
      state.categories.push(event.category);
    }
    state.metrics.categories = state.categories.length;
  } else bump(event.kind);
  const unlocked: string[] = [];
  for (const definition of BADGES) {
    if (
      (state.metrics[definition.metric] || 0) >= definition.target &&
      !state.awards[definition.id]
    ) {
      state.awards[definition.id] = {
        unlockedAt: event.at,
        earnedXp: definition.xp,
        historical,
      };
      unlocked.push(definition.id);
    }
  }
  return {state, unlocked};
}
/**
 * Requires every enrolled participant to finish in the creation window.
 * @param {Array} participants Frozen enrollment.
 * @param {object} completionTimes Trusted completion times.
 * @param {number} createdAt Challenge creation time.
 * @return {boolean} Whether Full House is eligible.
 */
export function fullHouse(
  participants: string[],
  completionTimes: Record<string, number>,
  createdAt: number,
): boolean {
  return (
    new Set(participants).size >= 2 &&
    participants.every(
      (id) =>
        completionTimes[id] >= createdAt &&
        completionTimes[id] <= createdAt + 14 * DAY,
    )
  );
}
/**
 * Validates earned personal badges and the three-pin limit.
 * @param {unknown} ids Proposed ordered pins.
 * @param {AchievementState} state Trusted achievement state.
 * @return {boolean} Whether all pins are valid.
 */
export function validPins(
  ids: unknown,
  state: AchievementState,
): ids is string[] {
  return (
    Array.isArray(ids) &&
    ids.length <= 3 &&
    new Set(ids).size === ids.length &&
    ids.every(
      (id) =>
        typeof id === "string" &&
        BADGES.some((b) => b.id === id && b.scope === "user") &&
        !!state.awards[id],
    )
  );
}

/**
 * Reads calendar progress without scanning activity history.
 * @param {AchievementState} state Persisted progress.
 * @param {string} metric Selected progress metric.
 * @param {number} at Current epoch milliseconds.
 * @return {number} Current progress value.
 */
export function metricAt(
  state: AchievementState | undefined,
  metric: string,
  at: number,
): number {
  if (!state) return 0;
  const week = weekKey(at);
  if (metric === "weekDays") return (state.weeks[week] || []).length;
  if (metric !== "activeWeeks") return state.metrics[metric] || 0;
  let cursor = Date.parse(week);
  if ((state.weeks[week] || []).length < 2) cursor -= 7 * DAY;
  let count = 0;
  while ((state.weeks[new Date(cursor).toISOString().slice(0, 10)] || [])
    .length >= 2) {
    count++; cursor -= 7 * DAY;
  }
  return Math.min(count, 4);
}

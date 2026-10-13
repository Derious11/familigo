export type BadgeCategory =
  | "Getting Started"
  | "Consistency"
  | "Social & Family"
  | "Challenge Milestones";
export type BadgeId =
  | "first_steps" | "game_on" | "say_hello" | "first_cheer"
  | "getting_warm" | "on_a_roll" | "streak_star" | "back_in_action"
  | "high_five" | "challenge_buddy" | "team_player" | "full_house"
  | "five_alive" | "double_digits" | "challenge_champion" | "explorer";
export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
  target: number;
  metric: string;
  scope: "user" | "family";
  xp: number;
}
const badge = (
  id: BadgeId,
  name: string,
  description: string,
  category: BadgeCategory,
  icon: string,
  target: number,
  metric: string,
  scope: "user" | "family" = "user",
): BadgeDefinition => ({
  id,
  name,
  description,
  category,
  icon,
  target,
  metric,
  scope,
  xp: 0,
});
export const BADGES: readonly BadgeDefinition[] = [
  badge(
    "first_steps",
    "First Steps",
    "Complete your first valid challenge.",
    "Getting Started",
    "👣",
    1,
    "completions",
  ),
  badge(
    "game_on",
    "Game On!",
    "Create your first challenge.",
    "Getting Started",
    "🏁",
    1,
    "created",
  ),
  badge(
    "say_hello",
    "Say Hello!",
    "Send a genuine message in Family Chat.",
    "Getting Started",
    "💬",
    1,
    "messages",
  ),
  badge(
    "first_cheer",
    "First Cheer",
    "Comment on another member's challenge.",
    "Getting Started",
    "📣",
    1,
    "comments",
  ),
  badge(
    "getting_warm",
    "Getting Warm",
    "Complete challenges on two separate days in a calendar week.",
    "Consistency",
    "🔥",
    2,
    "weekDays",
  ),
  badge(
    "on_a_roll",
    "On a Roll",
    "Be active on two days a week for two consecutive weeks.",
    "Consistency",
    "⚡",
    2,
    "activeWeeks",
  ),
  badge(
    "streak_star",
    "Streak Star",
    "Be active on two days a week for four consecutive weeks.",
    "Consistency",
    "🌟",
    4,
    "activeWeeks",
  ),
  badge(
    "back_in_action",
    "Back in Action",
    "Complete a challenge after seven full days without a completion.",
    "Consistency",
    "↩️",
    1,
    "returned",
  ),
  badge(
    "high_five",
    "High Five!",
    "React to three distinct challenge updates from other members.",
    "Social & Family",
    "🙌",
    3,
    "reactions",
  ),
  badge(
    "challenge_buddy",
    "Challenge Buddy",
    "Complete the same shared challenge as another member.",
    "Social & Family",
    "👥",
    1,
    "buddy",
  ),
  badge(
    "team_player",
    "Team Player",
    "Record your first valid team goal contribution.",
    "Social & Family",
    "🤝",
    1,
    "contributions",
  ),
  badge(
    "full_house",
    "Full House",
    "Everyone in the family at posting (2+) finishes within 14 days.",
    "Social & Family",
    "🏡",
    1,
    "fullHouse",
    "family",
  ),
  badge(
    "five_alive",
    "Five Alive",
    "Complete five challenges.",
    "Challenge Milestones",
    "🥉",
    5,
    "completions",
  ),
  badge(
    "double_digits",
    "Double Digits",
    "Complete ten challenges.",
    "Challenge Milestones",
    "🔟",
    10,
    "completions",
  ),
  badge(
    "challenge_champion",
    "Challenge Champion",
    "Complete twenty-five challenges.",
    "Challenge Milestones",
    "🏆",
    25,
    "completions",
  ),
  badge(
    "explorer",
    "Explorer",
    "Complete challenges in three supported activity types.",
    "Challenge Milestones",
    "🧭",
    3,
    "categories",
  ),
];
export interface AchievementAward {
  unlockedAt: number;
  earnedXp: number;
  historical: boolean;
  celebratedAt?: number;
}
export interface AchievementState {
  version: number;
  metrics: Record<string, number>;
  weeks: Record<string, string[]>;
  categories: string[];
  lastCompletion?: number;
  awards: Record<string, AchievementAward>;
}
export const emptyState = (): AchievementState => ({
  version: 1,
  metrics: {},
  weeks: {},
  categories: [],
  awards: {},
});
export const activityId = (name: string): string | undefined => {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    {
      pushup: "pushups",
      pushups: "pushups",
      squat: "squats",
      squats: "squats",
      plank: "plank",
      run: "run",
      running: "run",
      walk: "walk",
      walking: "walk",
      burpee: "burpees",
      burpees: "burpees",
      jumpingjacks: "jumpingjacks",
      weightcheckin: "weightcheckin",
    } as Record<string, string>
  )[normalized];
};

import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  AchievementState,
  emptyState,
} from "../../functions/src/achievements/catalog";
export { BADGES, emptyState } from "../../functions/src/achievements/catalog";
export {metricAt} from '../../functions/src/achievements/engine';
export type {
  AchievementState,
  BadgeDefinition,
} from "../../functions/src/achievements/catalog";
export interface AchievementProfile {
  state: AchievementState;
  pinnedBadgeIds: string[];
  familyCircleId?: string;
}
export const achievementCall = async <T = unknown>(
  name: string,
  data: unknown,
): Promise<T> =>
  (await httpsCallable<unknown, T>(getFunctions(), name)(data)).data;
export const watchAchievements = (
  id: string,
  callback: (profile: AchievementProfile) => void,
  family = false,
  onError?: (error: Error) => void,
) =>
  onSnapshot(
    doc(db, family ? "familyAchievements" : "achievementProfiles", id),
    (snapshot) => {
      const data = snapshot.data();
      callback({
        state: data?.state || emptyState(),
        pinnedBadgeIds: data?.pinnedBadgeIds || [],
        familyCircleId: data?.familyCircleId,
      });
    },
    (error) => onError?.(error),
  );

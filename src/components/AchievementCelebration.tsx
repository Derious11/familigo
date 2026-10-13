import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import {
  achievementCall,
  BADGES,
  watchAchievements,
} from "../services/achievementService";
import "./Profile/achievements.css";
export default function AchievementCelebration({
  actorId,
  familyCircleId,
  onView,
}: {
  actorId: string;
  familyCircleId: string;
  onView: () => void;
}) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    let claiming = false;
    const pending = new Set<string>();
    setIds([]);
    const claim = () => {
      if (!active || claiming || !pending.size) return;
      const requested = [...pending];
      pending.clear();
      let succeeded = false;
      claiming = true;
      achievementCall<{ badgeIds: string[] }>("updateAchievementProfile", {
        actorId,
        familyCircleId,
        celebrate: true,
      })
        .then((result) => {
          succeeded = true;
          if (!active || !result.badgeIds.length) return;
          setIds((previous) =>
            Array.from(new Set([...previous, ...result.badgeIds])),
          );
          if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
            confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 } });
        })
        .catch(() => {requested.forEach(id => pending.add(id));})
        .finally(() => {
          claiming = false;
          if (succeeded) claim();
        });
    };
    const unsubscribe = watchAchievements(actorId, (profile) => {
      for (const [id, award] of Object.entries(profile.state.awards)) {
        if (!award.historical && !award.celebratedAt && Date.now() - award.unlockedAt < 120000) pending.add(id);
      }
      claim();
    });
    window.addEventListener('online', claim);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('online', claim);
    };
  }, [actorId, familyCircleId]);
  if (!ids.length) return null;
  return (
    <aside
      className="achievement-toast"
      role="status"
      aria-live="polite"
      aria-label="New achievements"
    >
      <h2>Achievement Unlocked!</h2>
      <p>Look at you go. Celebrate your little wins!</p>
      {ids.map((id) => {
        const b = BADGES.find((b) => b.id === id);
        return (
          b && (
            <div key={id} className="achievement-card mt-3">
              <span className="achievement-icon" aria-hidden="true">
                {b.icon}
              </span>
              <div>
                <h4>{b.name}</h4>
                <p>{b.description}</p>
                {b.xp > 0 && <p>+{b.xp} XP</p>}
              </div>
            </div>
          )
        );
      })}
      <button
        onClick={() => {
          setIds([]);
          onView();
        }}
      >
        View achievements
      </button>
      <button onClick={() => setIds([])}>Continue</button>
    </aside>
  );
}

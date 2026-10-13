import React, { useEffect, useState } from "react";
import {
  AchievementProfile,
  achievementCall,
  BADGES,
  watchAchievements,
  BadgeDefinition,
  metricAt,
} from "../../services/achievementService";
import { User } from "../../types";
import "./achievements.css";
export default function BadgeCollection({
  user,
  familyCircleId,
}: {
  user: User;
  familyCircleId?: string;
}) {
  const [profile, setProfile] = useState<AchievementProfile>();
  const [family, setFamily] = useState<AchievementProfile>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setProfile(undefined);
    setError("");
    return watchAchievements(user.id, setProfile, false, () =>
      setError("Could not load achievements. Check your connection."),
    );
  }, [user.id]);
  useEffect(() => {
    setFamily(undefined);
    if (familyCircleId)
      return watchAchievements(familyCircleId, setFamily, true, () =>
        setError("Could not load family achievements."),
      );
  }, [familyCircleId]);
  const personal = BADGES.filter((b) => b.scope === "user");
  const state = profile?.state;
  const pins = profile?.pinnedBadgeIds || [];
  const save = async (ids: string[]) => {
    if (!familyCircleId) return;
    setSaving(true);
    setError("");
    try {
      await achievementCall("updateAchievementProfile", {
        actorId: user.id,
        familyCircleId,
        pinnedBadgeIds: ids,
      });
    } catch {
      setError(
        "Could not save pins. Choose up to three earned badges and try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const progress = (b: BadgeDefinition) =>
    Math.min(b.target, metricAt(state, b.metric, Date.now()));
  const locked = personal.filter((b) => !state?.awards[b.id]);
  const upcoming = [...locked]
    .sort((a, b) => progress(b) / b.target - progress(a) / a.target)
    .slice(0, 3);
  const card = (b: BadgeDefinition, compact = false) => {
    const award = state?.awards[b.id];
    const pinned = pins.includes(b.id);
    return (
      <article
        key={b.id}
        className={`achievement-card ${award ? "earned" : "locked"}`}
      >
        <span className="achievement-icon" aria-hidden="true">
          {b.icon}
        </span>
        <div>
          <p className="achievement-category">{b.category}</p>
          <h4>{b.name}</h4>
          <p>{b.description}</p>
          {award ? (
            <>
              <small>
                Earned {new Date(award.unlockedAt).toLocaleDateString()}
              </small>
              {!compact && (
                <button
                  disabled={
                    saving || !familyCircleId || (!pinned && pins.length >= 3)
                  }
                  aria-pressed={pinned}
                  onClick={() =>
                    save(
                      pinned
                        ? pins.filter((id) => id !== b.id)
                        : [...pins, b.id],
                    )
                  }
                >
                  {pinned ? "Unpin" : "Pin to Profile"}
                </button>
              )}
            </>
          ) : (
            <>
              <label htmlFor={`progress-${compact ? "next-" : ""}${b.id}`}>
                {progress(b)} / {b.target}
              </label>
              <progress
                id={`progress-${compact ? "next-" : ""}${b.id}`}
                value={progress(b)}
                max={b.target}
              />
            </>
          )}
        </div>
      </article>
    );
  };
  return (
    <section
      id="achievements"
      className="achievement-collection"
      aria-label="Achievements"
    >
      <h3>Featured Achievements</h3>
      <p className="achievement-hint">
        Pin up to three favorite wins to your profile.
      </p>
      {error && <p role="alert">{error}</p>}
      {!profile ? (
        <p role="status">Loading achievements…</p>
      ) : (
        <>
          <div className="achievement-pins">
            {pins.length ? (
              pins.map((id, i) => {
                const b = BADGES.find((b) => b.id === id);
                if (!b) return null;
                return (
                  <div key={id}>
                    <span aria-hidden="true">{b.icon}</span>
                    <b>{b.name}</b>
                    <div>
                      <button
                        disabled={saving || i === 0}
                        aria-label={`Move ${b.name} earlier`}
                        onClick={() => {
                          const ids = [...pins];
                          [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                          save(ids);
                        }}
                      >
                        ←
                      </button>
                      <button
                        disabled={saving || i === pins.length - 1}
                        aria-label={`Move ${b.name} later`}
                        onClick={() => {
                          const ids = [...pins];
                          [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]];
                          save(ids);
                        }}
                      >
                        →
                      </button>
                      <button
                        disabled={saving}
                        aria-label={`Unpin ${b.name}`}
                        onClick={() =>
                          save(pins.filter((value) => value !== id))
                        }
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p>Your favorite earned badges will appear here.</p>
            )}
          </div>
          {!!upcoming.length && (
            <>
              <h3>Your Next Achievements</h3>
              <div className="achievement-grid">
                {upcoming.map((b) => card(b, true))}
              </div>
            </>
          )}
          <h3>Earned Badges · {personal.length - locked.length}</h3>
          {personal.length === locked.length ? (
            <p>Small steps count. Your first badge is waiting!</p>
          ) : (
            <div className="achievement-grid">
              {personal.filter((b) => state?.awards[b.id]).map((b) => card(b))}
            </div>
          )}
          <details>
            <summary>Locked Badges · {locked.length}</summary>
            <div className="achievement-grid">{locked.map((b) => card(b))}</div>
          </details>
        </>
      )}
      {familyCircleId && (
        <>
          <h3>Family Achievements</h3>
          {BADGES.filter((b) => b.scope === "family").map((b) => (
            <article
              key={b.id}
              className={`achievement-card ${family?.state.awards[b.id] ? "earned" : "locked"}`}
            >
              <span className="achievement-icon" aria-hidden="true">
                {b.icon}
              </span>
              <div>
                <h4>{b.name}</h4>
                <p>{b.description}</p>
                {family?.state.awards[b.id] && (
                  <small>
                    Earned{" "}
                    {new Date(
                      family.state.awards[b.id].unlockedAt,
                    ).toLocaleDateString()}
                  </small>
                )}
              </div>
            </article>
          ))}
        </>
      )}
      {!!user.badges.filter(
        (b) => b.unlocked && !BADGES.some((def) => def.id === b.id),
      ).length && (
        <details>
          <summary>Earlier FamiliGo badges</summary>
          {user.badges
            .filter((b) => b.unlocked && !BADGES.some((def) => def.id === b.id))
            .map((b) => (
              <p key={b.id}>
                {b.icon} {b.name} — {b.description}
              </p>
            ))}
        </details>
      )}
    </section>
  );
}

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Flag, Mountain, ArrowRight, Trophy, Users, Sparkles } from 'lucide-react';
import { AppContext } from '../../App';
import { FamilyCircle, User } from '../../types';
import { adventureWeek, standings, suggestedTarget, trailPosition } from '../../lib/adventure.mjs';
import { ADVENTURE_THEMES, getAdventureTheme } from '../../lib/adventureThemes.mjs';
import { updateFamilyAdventureTheme } from '../../services/familyService';
import { startAdventure, watchAdventure, watchLeaderboardMembers, WeeklyAdventure } from '../../services/adventureService';
import AvatarImage from '../ui/AvatarImage';
import './adventure.css';

type Week = ReturnType<typeof adventureWeek>;
type Entry = User & { weeklyScore: number; rank: number };
const number = (value: number) => value.toLocaleString();
const dateLabel = (week: Week) => `${week.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${new Date(+week.end - 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;

export default function Leaderboard({ onCreateChallenge }: { onCreateChallenge?: () => void }) {
    const { familyCircle, currentUser } = useContext(AppContext);
    const [now, setNow] = useState(() => new Date());
    useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30000); return () => clearInterval(timer); }, []);
    const week = adventureWeek(now);
    if (!familyCircle) return null;
    return <ConnectedLeaderboard key={`${familyCircle.id}:${week.id}`} family={familyCircle} user={currentUser} week={week} onCreateChallenge={onCreateChallenge} />;
}

function ConnectedLeaderboard({ family, user, week, onCreateChallenge }: { family: FamilyCircle; user: User; week: Week; onCreateChallenge?: () => void }) {
    const [members, setMembers] = useState<User[]>(family.members);
    const [adventure, setAdventure] = useState<WeeklyAdventure | null>(null);
    const [goalReady, setGoalReady] = useState(false);
    const [membersReady, setMembersReady] = useState(false);
    const [goalError, setGoalError] = useState<string | null>(null);
    const [memberError, setMemberError] = useState<string | null>(null);
    const [retry, setRetry] = useState(0);
    const ids = family.members.map(member => member.id).sort().join('|');
    useEffect(() => {
        setGoalError(null); setGoalReady(false);
        return watchAdventure(family.id, week.id, value => { setAdventure(value); setGoalReady(true); setGoalError(null); }, error => { setGoalError(error.code); setGoalReady(false); });
    }, [family.id, week.id, retry]);
    useEffect(() => {
        setMemberError(null); setMembersReady(false);
        return watchLeaderboardMembers(ids.split('|').filter(Boolean), value => { setMembers(value); setMemberError(null); setMembersReady(true); }, error => { setMemberError(error.code); setMembersReady(false); });
    }, [family.id, ids, retry]);
    const error = goalError || memberError;
    const permissionError = goalError === 'permission-denied' || memberError === 'permission-denied';
    return <>
        {error && <div className="adventure-error" role="alert">{permissionError ? 'Access to your family’s adventure could not be verified. Goal setup is paused. Please retry; if this continues, contact support.' : 'Some adventure data could not be loaded. Goal setup is paused until it reconnects.'} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
        <LeaderboardBoard members={members} currentUserId={user?.id} week={week} adventure={adventure} themeId={family.adventureTheme} onThemeChange={theme => updateFamilyAdventureTheme(family.id, theme)} ready={goalReady && membersReady && !error} canStart={user?.role === 'adult' && !!family.adminIds?.includes(user.id)} onStart={target => startAdventure(family.id, week, target, members.length, user.id)} onCreateChallenge={onCreateChallenge} />
    </>;
}

export function LeaderboardBoard({ members, currentUserId, week, adventure, canStart = false, ready = true, onStart, onCreateChallenge, themeId = 'mountain', onThemeChange }: {
    members: User[]; currentUserId?: string; week: Week; adventure: Pick<WeeklyAdventure, 'target' | 'trailTarget'> | null;
    canStart?: boolean; ready?: boolean; onStart?: (target: number) => Promise<void>; onCreateChallenge?: () => void;
    themeId?: string; onThemeChange?: (theme: string) => Promise<void>;
}) {
    const data: Entry[] = useMemo(() => standings(members, week.start, week.end), [members, week.id]);
    const suggested = suggestedTarget(members, week.start);
    const [targetInput, setTargetInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [chosenTheme, setChosenTheme] = useState(themeId);
    const [savingTheme, setSavingTheme] = useState(false);
    const [themeStatus, setThemeStatus] = useState('');
    const [themeError, setThemeError] = useState('');
    useEffect(() => { setChosenTheme(themeId); }, [themeId]);
    const theme = getAdventureTheme(chosenTheme);
    const startPosition = trailPosition(0, 1);
    const finishPosition = trailPosition(1, 1);
    async function chooseTheme(id: string) {
        if (savingTheme || !onThemeChange) return;
        setSavingTheme(true); setThemeError(''); setThemeStatus('');
        const previous = chosenTheme;
        setChosenTheme(id);
        try { await onThemeChange(id); setThemeStatus(`${getAdventureTheme(id).name} selected for your family.`); }
        catch { setChosenTheme(previous); setThemeError('The scenery could not be saved. Please try again.'); }
        finally { setSavingTheme(false); }
    }
    const total = data.reduce((sum, member) => sum + member.weeklyScore, 0);
    const target = adventure?.target ?? suggested;
    const trailTarget = adventure?.trailTarget ?? Math.ceil(target / Math.max(1, members.length));
    const progress = Math.min(100, Math.floor(total / target * 100));
    const me = data.find(member => member.id === currentUserId);
    const groups: { members: Entry[]; score: number }[] = [];
    for (const member of [...data].reverse()) {
        const last = groups[groups.length - 1];
        if (last && Math.abs(Math.min(1, member.weeklyScore / trailTarget) - Math.min(1, last.score / trailTarget)) < 0.12) last.members.push(member);
        else groups.push({ members: [member], score: member.weeklyScore });
    }
    const selected = data.filter(member => selectedIds.includes(member.id));
    async function launch(event: React.FormEvent) {
        event.preventDefault(); setSaveError('');
        const value = Number(targetInput || suggested);
        if (!Number.isInteger(value) || value < 7 || value > 100000) { setSaveError('Choose a whole-number goal between 7 and 100,000.'); return; }
        setSaving(true);
        try { await onStart?.(value); } catch (error) { setSaveError(error instanceof Error && error.message.includes('already started') ? error.message : 'The adventure could not be started. Please try again.'); }
        finally { setSaving(false); }
    }
    return <div className="adventure-leaderboard">
        <section className="family-adventure" aria-labelledby="adventure-title">
            <div className="adventure-heading">
                <div><p className="app-eyebrow"><Mountain size={14} aria-hidden="true" /> This week’s family adventure</p><h2 id="adventure-title">Go further, together.</h2><p>Every effort moves your family forward.</p></div>
                <span className="adventure-week">{dateLabel(week)}<small>Monday–Sunday · UTC</small></span>
            </div>
            <details className="adventure-theme-picker">
                <summary><span>Choose your scenery</span><span>{theme.name}</span></summary>
                <p>Pick a place to explore together. Everyone in your family sees the same scenery; your points and goal stay the same.</p>
                <div className="adventure-theme-options" role="group" aria-label="Family adventure scenery">{ADVENTURE_THEMES.map(option => <button key={option.id} type="button" aria-pressed={theme.id === option.id} disabled={savingTheme || !onThemeChange || !ready} onClick={() => chooseTheme(option.id)}>
                    <img src={option.thumbnail} width="360" height="240" alt="" loading="lazy"/><strong>{option.name}</strong><small>{option.description}</small><span>{theme.id === option.id ? savingTheme ? 'Saving…' : 'Selected' : 'Choose scenery'}</span>
                </button>)}</div>
                <p role="status">{themeStatus}</p>{themeError && <p className="adventure-theme-error" role="alert">{themeError}</p>}
            </details>
            <div className="adventure-map" aria-label={`${theme.name} adventure trail`} data-theme={theme.id}>
                <img className="adventure-landscape" src={theme.image} alt="" width="1536" height="1024" fetchPriority="high" />
                <div className="adventure-map-badge"><Flag size={14} aria-hidden="true" /> {adventure ? progress >= 100 ? 'Destination reached!' : theme.destination : 'Your next adventure awaits'}</div>
                <span className="adventure-start" style={{ left: `${startPosition.x}%`, top: `${startPosition.y + 3}%` }} aria-hidden="true">Start</span>
                <span className="adventure-finish-label" style={{ left: `${finishPosition.x}%`, top: `${finishPosition.y + 4}%` }} aria-hidden="true">Finish</span>
                {adventure && groups.map(group => {
                    const position = trailPosition(group.score, trailTarget);
                    const member = group.members.find(person => person.id === currentUserId) ?? group.members[0];
                    return <button type="button" key={group.members[0].id} style={{ left: `${position.x}%`, top: `${position.y}%` }} className={`adventure-marker ${group.members.some(person => person.id === currentUserId) ? 'adventure-marker-you' : ''}`} onClick={() => setSelectedIds(group.members.map(person => person.id))} aria-label={group.members.map(person => `${person.name}${person.id === currentUserId ? ' (you)' : ''}, ${person.weeklyScore} activity points`).join('; ')} aria-pressed={group.members.some(person => selectedIds.includes(person.id))}>
                        <AvatarImage userId={member.id} hasAvatar={member.hasAvatar} cacheKey={member.avatarUpdatedAt?.getTime?.()} alt="" />
                        {group.members.length > 1 ? <span className="adventure-marker-count">+{group.members.length - 1}</span> : <span className="adventure-marker-name">{member.id === currentUserId ? 'You' : member.name}</span>}
                    </button>;
                })}
                {!adventure && <div className="adventure-map-invite"><img src="/assets/brand/activities/gogo-team@3x.webp" alt="" width="144" height="144"/><span>One family.<br/><strong>A whole new adventure.</strong></span></div>}
            </div>
            {selected.length > 0 && adventure && <div className="adventure-marker-detail"><div>{selected.map(member => <p key={member.id}><strong>{member.name}{member.id === currentUserId ? ' (you)' : ''}</strong><span>{number(member.weeklyScore)} points · {Math.min(100, Math.floor(member.weeklyScore / trailTarget * 100))}% of trail</span></p>)}</div><button type="button" onClick={() => setSelectedIds([])} aria-label="Close trail member details">×</button></div>}
            <div className="adventure-summary">
                <div className="adventure-goal-heading"><span><Users size={16} aria-hidden="true"/> {adventure ? 'Our family goal' : 'Suggested family goal'}</span><span className="adventure-status">{!ready ? 'Connecting…' : adventure ? 'Goal locked for this week' : 'Ready when you are'}</span></div>
                <div className="adventure-total"><strong>{number(total)}</strong><span>/ {number(target)} activity points</span><b>{progress}%</b></div>
                <div className="adventure-progress" role="progressbar" aria-label="Family activity goal" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }}/></div>
                <p className="adventure-milestone">{adventure ? total >= target ? 'You reached your destination together. Every extra effort still counts!' : `${number(target - total)} more points to reach the ${theme.destination.toLowerCase()} together.` : 'Start this week’s adventure to put your family on the trail.'}</p>
                {!adventure && canStart && <form className="adventure-setup" onSubmit={launch}>
                    <label htmlFor="adventure-target">Family goal <span>Suggested: {number(suggested)}</span><input id="adventure-target" type="number" min="7" max="100000" step="1" value={targetInput} placeholder={String(suggested)} onChange={event => setTargetInput(event.target.value)} disabled={saving || !ready} /></label>
                    <button type="submit" disabled={saving || !ready || !members.length}>{saving ? 'Starting…' : 'Start our adventure'}<ArrowRight size={16} aria-hidden="true"/></button>
                    <p>Includes activity already recorded this week. Your goal stays fixed until Sunday.</p>
                    {saveError && <p className="adventure-save-error" role="alert">{saveError}</p>}
                </form>}
                {!adventure && !canStart && <p className="adventure-parent-note">A family parent can set the goal and start this week’s adventure.</p>}
            </div>
        </section>
        {me && <div className="adventure-your-week"><span className="adventure-your-icon"><Sparkles size={22} aria-hidden="true"/></span><div><small>Your contribution this week</small><strong>{number(me.weeklyScore)} activity points</strong></div><span>{total ? `${Math.round(me.weeklyScore / total * 100)}% of your family’s progress` : 'Your first step counts, too.'}</span></div>}
        <section className="app-leaderboard-board adventure-standings" aria-labelledby="standings-title">
            <div className="app-board-heading"><div><p className="app-eyebrow">A little friendly competition</p><h2 id="standings-title">Family standings</h2></div><span>This week</span></div>
            {data.length ? <ol className="adventure-ranking">{data.map(member => <li key={member.id} className={`app-ranking-row ${member.id === currentUserId ? 'app-ranking-you' : ''}`}><span className={`app-ranking-number adventure-rank-${member.rank}`} aria-label={`Rank ${member.rank}`}>{member.rank === 1 && member.weeklyScore > 0 ? <Trophy size={18} aria-hidden="true"/> : member.rank}</span><AvatarImage userId={member.id} hasAvatar={member.hasAvatar} cacheKey={member.avatarUpdatedAt?.getTime?.()} alt="" className="app-ranking-avatar"/><span className="app-ranking-name">{member.name}{member.id === currentUserId && <small>You</small>}</span><span className="adventure-row-track" aria-hidden="true"><span style={{ width: `${Math.min(100, member.weeklyScore / trailTarget * 100)}%` }}/></span><span className="app-ranking-score"><strong>{number(member.weeklyScore)}</strong><small>activity points</small></span></li>)}</ol> : <p className="adventure-milestone">Your family’s first adventure starts here.</p>}
            <details className="app-score-explainer"><summary>How the adventure works</summary><p>Activity points count recorded actions, including login rewards and challenge participation, from Monday 00:00 to the following Monday 00:00 UTC. They are not XP amounts or exercise minutes. No activity means zero points; equal scores share a rank.</p><p>A parent confirms the family goal before starting. Suggestions use the average of weeks with recorded activity among the previous four complete weeks, plus 10%. With no history, we suggest 14 points per member. The goal is fixed once started and does not change when challenges or members are added.</p><p>Each avatar follows a trail target of {number(trailTarget)} points: the family goal divided by the member count when the adventure starts, rounded up. It is a milestone, not a required quota. Nearby avatars share a marker; tap to see everyone. Extra points still help the family after an avatar reaches the summit. Points from current family members count, including activity earlier in this week. New weeks start a fresh adventure.</p></details>
        </section>
        {onCreateChallenge && <button className="adventure-challenge-button" type="button" onClick={onCreateChallenge}><span>Keep the adventure going</span>Take on a challenge <ArrowRight size={19} aria-hidden="true"/></button>}
    </div>;
}

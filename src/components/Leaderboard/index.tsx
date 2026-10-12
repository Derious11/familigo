import React,{ useContext,useMemo } from 'react';
import { AppContext } from '../../App';
import { TrophyIcon } from '../Icons';
import AvatarImage from '../ui/AvatarImage';
const Leaderboard: React.FC = () => {
    const { familyCircle, currentUser } = useContext(AppContext);
    const leaderboardData = useMemo(() => {
        if (!familyCircle)
            return [];
        const today = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        });
        return familyCircle.members.map(member => {
            let weeklyScore = 0;
            if (member.activityMap) {
                last7Days.forEach(date => {
                    weeklyScore += member.activityMap![date] || 0;
                });
            }
            if (weeklyScore === 0)
                weeklyScore = member.streak;
            return { ...member, weeklyScore };
        }).sort((a, b) => b.weeklyScore - a.weeklyScore);
    }, [familyCircle]);
    if (!familyCircle)
        return null;
    const top3 = leaderboardData.slice(0, 3);
    const rest = leaderboardData.slice(3);
    return <section className="app-leaderboard-board" aria-label="Family leaderboard">
        <div className="app-board-heading"><div><p className="app-eyebrow">Your family lineup</p><h2>Weekly Legends</h2></div><span>7-day activity</span></div>
        <div className="app-winners">{top3.map((member, index) => <article key={member.id} className={`app-winner app-winner-${index}`}><span className="app-rank">{index + 1}{['st', 'nd', 'rd'][index]}</span><AvatarImage userId={member.id} hasAvatar={member.hasAvatar} cacheKey={member.avatarUpdatedAt?.getTime?.()} alt={member.name} className="app-winner-avatar"/><h3>{member.name}{member.id === currentUser?.id && <small> You</small>}</h3><p><strong>{member.weeklyScore}</strong> points</p></article>)}</div>
        <div className="app-ranking-list">{rest.map((member, index) => <div key={member.id} className={`app-ranking-row ${member.id === currentUser?.id ? 'app-ranking-you' : ''}`}><span className="app-ranking-number">{index + 4}</span><AvatarImage userId={member.id} hasAvatar={member.hasAvatar} cacheKey={member.avatarUpdatedAt?.getTime?.()} alt={member.name} className="app-ranking-avatar"/><span className="app-ranking-name">{member.name}{member.id === currentUser?.id && <small> You</small>}</span><span className="app-ranking-score"><strong>{member.weeklyScore}</strong><small>points</small></span></div>)}</div>
        <div className="app-board-note"><TrophyIcon className="w-5 h-5"/><p>Big or small, every effort is worth cheering for.</p></div>
        <details className="app-score-explainer"><summary>How points work</summary><p>Points count recorded activity over the last seven days, including XP-earning actions such as login rewards and challenge completion. If a member has no activity recorded in that period, their login streak is used instead.</p></details>
    </section>;
};
export default Leaderboard;

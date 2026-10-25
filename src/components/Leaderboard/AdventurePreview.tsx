import { useState } from 'react';
import { adventureWeek } from '../../lib/adventure.mjs';
import { LeaderboardBoard } from './index';
import { User } from '../../types';
import Header from '../Header';
import AppTabIntro from '../AppTabIntro';
import { AppContext } from '../../App';
import '../app.css';

// Development review only. No Firestore listeners or writes are mounted here.
export default function AdventurePreview() {
    const [scenario, setScenario] = useState('active');
    const [target, setTarget] = useState(56);
    const [extra, setExtra] = useState(0);
    const [notice, setNotice] = useState('');
    const [themeId, setThemeId] = useState('mountain');
    const week = adventureWeek();
    const names = scenario === 'solo' ? ['Alex'] : scenario === 'large' ? Array.from({ length: 12 }, (_, i) => `Member ${i + 1}`) : ['Maya', 'Dad', 'Alex', 'Mom'];
    const members = names.map((name, index) => ({ id: `preview-${index}`, name, hasAvatar: false, role: 'adult', streak: 0, badges: [], emailVerified: true, activityMap: { [week.id]: scenario === 'empty' ? 0 : scenario === 'ties' ? 9 : scenario === 'complete' ? 30 : [11, 9, 6 + extra, 3][index % 4] } } as User));
    const user = members[Math.min(2, members.length - 1)];
    return <AppContext.Provider value={{ currentUser: user, familyCircle: { name: 'The Adventure Family', members } }}><div className="app-shell min-h-screen"><div className="app-shell-width mx-auto pb-24"><Header activeView="history" setActiveView={() => {}}/><main className="app-main-content">
        <div className="adventure-preview-controls"><span>Design preview · fictional data</span><label>Scenario <select value={scenario} onChange={event => { setScenario(event.target.value); setExtra(0); }}>{['active', 'setup', 'empty', 'ties', 'solo', 'large', 'complete'].map(item => <option key={item}>{item}</option>)}</select></label><button type="button" onClick={() => setExtra(value => value + 2)}>Add 2 points</button></div>
        <AppTabIntro eyebrow="Your family. One adventure." title="Every effort counts." description="Climb together, cheer each other on, and see how far your family can go."/>
        <LeaderboardBoard key={scenario} members={members} currentUserId={user.id} week={week} adventure={scenario === 'setup' ? null : { target, trailTarget: Math.ceil(target / members.length) }} themeId={themeId} onThemeChange={async value => { setThemeId(value); }} canStart onStart={async value => { setTarget(value); setScenario('active'); }} onCreateChallenge={() => setNotice('Challenge action connected. In the app, this opens the challenge creator.')} />
        {notice && <p role="status" className="adventure-preview-notice">{notice}</p>}
        <details className="adventure-preview-history"><summary>Past Challenges</summary><p>Your completed family challenges appear here.</p></details>
    </main></div></div></AppContext.Provider>;
}

import { useState } from 'react';
import { AppContext } from '../App';
import PendingApproval from '../components/Auth/PendingApproval';
import ErrorState from '../components/ErrorState';
import OnboardingFlow from '../components/OnboardingFlow';
import { usePageSeo } from '../lib/seo';
import AdventurePreview from '../components/Leaderboard/AdventurePreview';
const demoUser = { id: 'visual-demo-only', name: 'Demo Parent', role: 'adult', status: 'pending_approval' };
export default function DesignReview() {
    const [screen, setScreen] = useState(() => new URLSearchParams(location.search).get('screen') === 'leaderboard' ? 'leaderboard' : 'onboarding');
    usePageSeo({ title: 'FamiliGo | Account State Review', description: 'Read-only development review of account screens.', noIndex: true });
    return <div className="app-shell"><nav className="app-review-navigation" aria-label="Account state review"><span>Visual review only</span>{['onboarding', 'approval', 'error', 'leaderboard'].map(item => <button type="button" key={item} aria-pressed={screen === item} onClick={() => setScreen(item)}>{item}</button>)}<a href="/">Landing</a><a href="/app">App</a></nav>{screen === 'leaderboard' ? <AdventurePreview/> : <AppContext.Provider value={{ currentUser: demoUser }}>{screen === 'onboarding' ? <OnboardingFlow readOnly user={demoUser as any} setFamilyCircle={() => { }}/> : screen === 'approval' ? <PendingApproval readOnly/> : <ErrorState />}</AppContext.Provider>}</div>;
}

import { usePostHog } from 'posthog-js/react';
import { useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Footprints, Heart, Menu, MoveUpRight, Sparkles, Trophy, Users, X, Zap } from 'lucide-react';
import { usePageSeo } from '../lib/seo';
import MarketingBrand from '../components/MarketingBrand';
import './marketing-landing.css';

const signupUrl = '/early-access?role=parent';
const navigation = [['How it works', '#how-it-works'], ['Challenges', '#challenges'], ['For parents', '#for-parents'], ['FAQ', '#faq']];
const questions = [
    ['Is FamiliGo competitive?', 'Yes! Friendly competition and teamwork go together. Take on challenges, climb your private family leaderboard, and celebrate everyone’s progress.'],
    ['Is FamiliGo free?', 'The current closed beta is free. A parent or guardian creates an account and requests access; family challenges become available after approval.'],
    ['Does it work on iPhone and Android?', 'Yes. FamiliGo is a mobile-friendly web app on iPhone and Android. No native app download is needed.'],
    ['What is FamiliGo?', 'FamiliGo is a family fitness challenge app where parents, kids, and teens take on challenges, climb a private family leaderboard, and cheer each other on.'],
    ['Who is FamiliGo for?', 'Parents and guardians who want a playful way to get their family moving together. A parent starts the account and leads family setup.'],
    ['Do we have to be athletic?', 'No. Choose activities and goals appropriate to each person’s abilities. Participation and enjoying time together are the starting point.'],
    ['Do we need special equipment?', 'Activities such as walking and squats can use everyday movement. Check each activity’s instructions and choose a suitable space before starting.'],
    ['How do we get started?', 'Request free beta access by creating a parent account. Requests are reviewed in waves. Once approved, create your Family Circle, invite your family, and start a challenge.'],
];

function SignupLink({ children = 'Request Free Beta Access', className = '', placement }: { children?: React.ReactNode; className?: string; placement: string }) {
    const posthog = usePostHog();
    return <a className={`fg-button ${className}`} href={signupUrl} onClick={() => { posthog?.capture('beta_signup_clicked', { placement, source: 'landing', destination: signupUrl }); try { localStorage.setItem('familiGoRole', 'parent'); } catch { /* Navigation still works when storage is unavailable. */ } }}>{children}<ArrowRight size={18} aria-hidden="true" /></a>;
}

function Brand() {
    return <MarketingBrand />;
}

export default function MarketingLanding() {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButton = useRef<HTMLButtonElement>(null);
    usePageSeo({ title: 'FamiliGo | Family Fitness Challenges for Parents, Kids & Teens', description: 'Create family fitness challenges, enjoy friendly competition, and climb your private family leaderboard. Request free, parent-led beta access.', canonicalPath: '/', noIndex: __FIREBASE_CONFIG__.projectId !== 'familigo-11643' || window.location.hostname.includes('--') });

    return <div className="fg-landing">
        <a className="fg-skip" href="#main-content">Skip to content</a>
        <header className="fg-header">
            <div className="fg-container fg-nav">
                <Brand />
                <nav className="fg-desktop-links" aria-label="Main navigation">{navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
                <div className="fg-nav-actions"><a className="fg-login" href="/login">Log in</a><SignupLink className="fg-header-cta" placement="header" /><button ref={menuButton} className="fg-menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="fg-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div>
            </div>
            {menuOpen && <nav id="fg-mobile-menu" className="fg-mobile-links" aria-label="Mobile navigation" onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } }}>{navigation.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}<a href="/login">Log in</a><SignupLink placement="mobile_menu" /></nav>}
        </header>

        <main id="main-content">
            <section className="fg-hero">
                <div className="fg-container fg-hero-grid">
                    <div className="fg-hero-copy">
                        <p className="fg-eyebrow"><span className="fg-live-dot" /> Family fitness challenges</p>
                        <h1>Turn family fitness<br />into a <span>friendly<br />competition.</span></h1>
                        <p className="fg-lead">Create challenges, climb your private family leaderboard, and cheer each other on. Make staying active something the whole family looks forward to.</p>
                        <div className="fg-hero-actions"><SignupLink placement="hero" /><a className="fg-text-link" href="#how-it-works">See how it works <MoveUpRight size={18} aria-hidden="true" /></a></div>
                        <p className="fg-microcopy">Free closed beta · Parent-led · Requests reviewed in waves</p>
                        <div className="fg-hero-note"><span className="fg-note-icon"><Heart size={18} aria-hidden="true" /></span><span>Every family has a starting line.<br /><strong>Yours begins together.</strong></span></div>
                    </div>
                    <div className="fg-hero-art fg-product-hero">
                        <span className="fg-art-spark fg-spark-one" aria-hidden="true">✦</span><span className="fg-art-spark fg-spark-two" aria-hidden="true">✦</span>
                        <div className="fg-floating-label"><Sparkles size={17} aria-hidden="true" /> Your family. Your bragging rights.</div>
                        <figure className="fg-product-screen"><div className="fg-screenshot-crop"><img src="/assets/brand/challenge-creation.webp" width="920" height="2048" alt="FamiliGo’s New Challenge screen: choose Solo Challenge or Team Goal, pick an activity, set a target, and post your challenge." fetchPriority="high" /></div></figure>
                        <img className="fg-gogo-hero" src="/assets/brand/gogo-thumbs-up.webp" width="1024" height="1536" alt="GoGo, FamiliGo’s blue mascot, giving a cheerful thumbs-up." />
                        <p className="fg-demo-caption">Actual FamiliGo challenge setup • Meet GoGo, our movement sidekick</p>
                    </div>
                </div>
                <div className="fg-container fg-hero-strip"><span>Get Fit. Have Fun. Together.</span><div><span><Users size={18} aria-hidden="true" /> Family connection</span><span><Zap size={18} aria-hidden="true" /> Fitness challenges</span><span><Trophy size={18} aria-hidden="true" /> Friendly competition</span></div></div>
            </section>

            <section className="fg-section" id="how-it-works">
                <div className="fg-container"><div className="fg-section-heading"><p className="fg-eyebrow">Simple to start. Fun to keep playing.</p><h2>Challenge. Compete.<br /><span>Celebrate. Repeat.</span></h2><p>Your family. Your challenges. A reason to come back for more.</p></div>
                    <div className="fg-steps">{[
                        { icon: Users, title: 'Bring your family together', copy: 'Request free access with a parent account. After approval, create your private Family Circle and invite your family.' },
                        { icon: Footprints, title: 'Let the challenges begin', copy: 'Pick an activity, set a target, and post a solo challenge for family members to complete—or work toward a shared team goal.' },
                        { icon: Trophy, title: 'Compete, celebrate, repeat', copy: 'Log your activity, earn XP, follow the family leaderboard, and cheer on each other’s wins.' },
                    ].map(({ icon: Icon, title, copy }, index) => <article className="fg-step" key={title}><div className={`fg-step-visual fg-step-visual-${index}`}><Icon size={42} strokeWidth={1.5} aria-hidden="true" /><span className="fg-step-number">0{index + 1}</span></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
                </div>
            </section>

            <section className="fg-section fg-evidence-section" id="inside-familigo"><div className="fg-container">
                <div className="fg-section-heading"><p className="fg-eyebrow">Inside FamiliGo</p><h2>Your next challenge.<br /><span>Your next family win.</span></h2><p>See the family experience in the app, plus a preview of the new achievements.</p></div>
                <div className="fg-evidence-grid">
                    <article className="fg-evidence-card"><div className="fg-evidence-image"><img src="/assets/brand/product/family-challenge.jpg" width="342" height="466" loading="lazy" alt="Actual FamiliGo walking challenge with a 30-minute target, family progress, and a Mark Complete button. Synthetic demo family." /></div><h3>Challenge your family</h3><p>Pick a target, see who steps up, and follow everyone’s progress.</p></article>
                    <article className="fg-evidence-card"><div className="fg-evidence-image"><img src="/assets/brand/product/featured-badges.jpg" width="342" height="388" loading="lazy" alt="FamiliGo achievement preview showing earned badges pinned on a demo member’s profile." /></div><span className="fg-preview-label">Achievement preview</span><h3>Make progress worth showing off</h3><p>Collect achievements for showing up, building habits, and joining in.</p></article>
                    <article className="fg-evidence-card"><div className="fg-evidence-image"><img src="/assets/brand/product/achievement-unlock.jpg" width="358" height="270" loading="lazy" alt="Actual FamiliGo High Five achievement unlock celebration for reacting to three updates from other members." /></div><span className="fg-preview-label">Achievement preview</span><h3>Earn your bragging rights</h3><p>Celebrate the little wins—including cheering each other on.</p></article>
                </div>
                <p className="fg-catalog-note">Genuine local app screenshots with a synthetic demo family. The new achievement experience is in preview; availability follows its release.</p>
            </div></section>

            <section className="fg-section fg-challenge-section" id="challenges"><div className="fg-container"><div className="fg-heading-row"><div><p className="fg-eyebrow">Find your family’s kind of fun</p><h2>Who’s up for<br /><span>a challenge?</span></h2></div><p>A walk around the block. A few reps in the living room. Your next family rivalry starts with a goal everyone can try.</p></div>
                <div className="fg-challenges">{[
                    { icon: Footprints, name: 'Who’s finishing the family walk?', activity: 'Walking', copy: 'Set a walking target and see who completes it—or team up to reach a shared goal.', style: 'walk' },
                    { icon: Zap, name: 'Think you can beat Dad’s squat score?', activity: 'Squats', copy: 'Post a squat challenge, log your reps, and give the family something to cheer about.', style: 'squat' },
                    { icon: Sparkles, name: 'Who’s climbing the leaderboard?', activity: 'Jumping jacks', copy: 'Complete a jumping-jack challenge, earn XP, and check your place on the family leaderboard.', style: 'jump' },
                ].map(({ icon: Icon, name, activity, copy, style }) => <article className={`fg-challenge fg-challenge-${style}`} key={activity}><div className="fg-challenge-art"><Icon size={64} strokeWidth={1.4} aria-hidden="true" /><span>{activity}</span></div><div className="fg-challenge-copy"><h3>{name}</h3><p>{copy}</p></div></article>)}</div><p className="fg-catalog-note">Ideas using activities in FamiliGo. Parents choose goals suitable for their family.</p>
            </div></section>

            <section className="fg-section" id="for-parents"><div className="fg-container fg-parents-grid"><div className="fg-family-panel"><div className="fg-family-symbol" aria-hidden="true"><Heart size={76} strokeWidth={1.3} /></div><p>More together.<br /><span>One move at a time.</span></p><div className="fg-family-pill"><Users size={17} aria-hidden="true" /> Your family. Your starting line.</div></div><div><p className="fg-eyebrow">Made for families. Led by parents.</p><h2>Made for families.<br /><span>Fun for everyone.</span></h2><p className="fg-section-intro">Make being active a family experience they’ll actually want to join. Different abilities. Different schedules. One Family Circle.</p><ul className="fg-parent-points">{[['For parents', 'Make fitness a shared experience without adding a complicated routine to your day.'], ['For kids & teens', 'Take on challenges, earn XP, and compete for the top spot on your family leaderboard.'], ['For the whole family', 'Some days you win. Some days your kids beat you. Celebrate effort and keep cheering each other on.']].map(([title, copy]) => <li key={title}><span><Check size={18} aria-hidden="true" /></span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ul><a className="fg-text-link" href="/privacy">Read our privacy policy <ArrowRight size={17} aria-hidden="true" /></a></div></div></section>

            <section className="fg-section fg-faq-section" id="faq"><div className="fg-container fg-faq-grid"><div><p className="fg-eyebrow">A few things you might be wondering</p><h2>Good questions.<br /><span>Simple answers.</span></h2><p className="fg-section-intro">Still curious? We’re here to help.</p><a className="fg-text-link" href="mailto:support@familigo.life">Get in touch <ArrowRight size={17} aria-hidden="true" /></a></div><div className="fg-faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={19} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></div></section>

            <section className="fg-final-section"><div className="fg-container fg-final"><span className="fg-final-star" aria-hidden="true">✦</span><p className="fg-eyebrow">A little competition. A lot more together.</p><h2>Ready to challenge<br />your family?</h2><p>Your first challenge could become a new family tradition.<br />Request free beta access and get the family in the game.</p><SignupLink className="fg-button-white" placement="footer" /><p className="fg-final-note">Free closed beta · Create a parent account · Access follows approval</p></div></section>
        </main>

        <footer className="fg-footer"><div className="fg-container"><div className="fg-footer-top"><div><Brand /><p>Get Fit. Have Fun. Together.</p></div><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="#challenges">Challenges</a><a href="#for-parents">For parents</a><a href="/faq">FAQ</a><a href="mailto:support@familigo.life">Support</a></nav></div><div className="fg-footer-bottom"><span>© {new Date().getFullYear()} FamiliGo</span><div><a href="/privacy">Privacy policy</a><a href="/delete-account">Account deletion</a><a href="/login">Log in</a></div><span>Made for more together.</span></div></div></footer>
    </div>;
}

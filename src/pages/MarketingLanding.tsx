import { useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Footprints, Heart, Menu, MoveUpRight, Sparkles, Trophy, Users, X, Zap } from 'lucide-react';
import { usePageSeo } from '../lib/seo';
import MarketingBrand from '../components/MarketingBrand';
import './marketing-landing.css';

const signupUrl = '/early-access?role=parent';
const navigation = [['How it works', '#how-it-works'], ['Challenges', '#challenges'], ['For parents', '#for-parents'], ['FAQ', '#faq']];
const questions = [
    ['What is FamiliGo?', 'FamiliGo is a family activity game that turns everyday movement into playful challenges and shared progress. It is currently in early access.'],
    ['Who is FamiliGo for?', 'Parents and guardians who want a playful way to get their family moving together. A parent starts the account and leads family setup.'],
    ['Do we have to be athletic?', 'No. Choose activities and goals appropriate to each person’s abilities. Participation and enjoying time together are the starting point.'],
    ['Do we need special equipment?', 'Activities such as walking and squats can use everyday movement. Check each activity’s instructions and choose a suitable space before starting.'],
    ['How do we get started?', 'Join early access by creating a parent account. Beta requests are reviewed in waves. Once approved, you can set up your family and start challenges.'],
];

function SignupLink({ children = 'Join Early Access', className = '' }: { children?: React.ReactNode; className?: string }) {
    return <a className={`fg-button ${className}`} href={signupUrl} onClick={() => localStorage.setItem('familiGoRole', 'parent')}>{children}<ArrowRight size={18} aria-hidden="true" /></a>;
}

function Brand() {
    return <MarketingBrand />;
}

export default function MarketingLanding() {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuButton = useRef<HTMLButtonElement>(null);
    usePageSeo({ title: 'FamiliGo | Make movement your family’s favorite game', description: 'Turn everyday movement into family fun with playful challenges and shared wins. Join FamiliGo early access.', canonicalPath: '/', noIndex: __FIREBASE_CONFIG__.projectId !== 'familigo-11643' || window.location.hostname.includes('--') });

    return <div className="fg-landing">
        <a className="fg-skip" href="#main-content">Skip to content</a>
        <header className="fg-header">
            <div className="fg-container fg-nav">
                <Brand />
                <nav className="fg-desktop-links" aria-label="Main navigation">{navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
                <div className="fg-nav-actions"><a className="fg-login" href="/login">Log in</a><SignupLink className="fg-header-cta" /><button ref={menuButton} className="fg-menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="fg-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div>
            </div>
            {menuOpen && <nav id="fg-mobile-menu" className="fg-mobile-links" aria-label="Mobile navigation" onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } }}>{navigation.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}<a href="/login">Log in</a><SignupLink /></nav>}
        </header>

        <main id="main-content">
            <section className="fg-hero">
                <div className="fg-container fg-hero-grid">
                    <div className="fg-hero-copy">
                        <p className="fg-eyebrow"><span className="fg-live-dot" /> The family activity game</p>
                        <h1>Make movement<br />the family’s<br /><span>favorite game.</span></h1>
                        <p className="fg-lead">A little friendly competition. A lot more together.<br className="fg-desktop-break" /> Turn everyday movement into playful challenges and shared wins.</p>
                        <div className="fg-hero-actions"><SignupLink /><a className="fg-text-link" href="#how-it-works">See how it works <MoveUpRight size={18} aria-hidden="true" /></a></div>
                        <p className="fg-microcopy">Parent-led. Currently in beta. Access follows approval.</p>
                        <div className="fg-hero-note"><span className="fg-note-icon"><Heart size={18} aria-hidden="true" /></span><span>Every family has a starting line.<br /><strong>Yours begins together.</strong></span></div>
                    </div>
                    <div className="fg-hero-art fg-product-hero">
                        <span className="fg-art-spark fg-spark-one" aria-hidden="true">✦</span><span className="fg-art-spark fg-spark-two" aria-hidden="true">✦</span>
                        <div className="fg-floating-label"><Sparkles size={17} aria-hidden="true" /> Small moves. Big memories.</div>
                        <figure className="fg-product-screen"><div className="fg-screenshot-crop"><img src="/assets/brand/challenge-creation.webp" width="920" height="2048" alt="FamiliGo’s New Challenge screen: choose Solo Challenge or Team Goal, pick an activity, set a target, and post your challenge." fetchPriority="high" /></div></figure>
                        <img className="fg-gogo-hero" src="/assets/brand/gogo-thumbs-up.webp" width="1024" height="1536" alt="GoGo, FamiliGo’s blue mascot, giving a cheerful thumbs-up." />
                        <p className="fg-demo-caption">Actual FamiliGo challenge setup • Meet GoGo, our movement sidekick</p>
                    </div>
                </div>
                <div className="fg-container fg-hero-strip"><span>For the joy of moving together.</span><div><span><Users size={18} aria-hidden="true" /> Family connection</span><span><Zap size={18} aria-hidden="true" /> Playful challenges</span><span><Trophy size={18} aria-hidden="true" /> Shared wins</span></div></div>
            </section>

            <section className="fg-section" id="how-it-works">
                <div className="fg-container"><div className="fg-section-heading"><p className="fg-eyebrow">Simple to start. Fun to keep playing.</p><h2>Less “we should.”<br />More <span>“let’s do this.”</span></h2><p>No complicated routines. Just a playful reason to get moving together.</p></div>
                    <div className="fg-steps">{[
                        { icon: Users, title: 'Bring your family', copy: 'A parent creates an account. After beta approval, set up your family space.' },
                        { icon: Footprints, title: 'Pick your next move', copy: 'Choose an activity, set your target, and post a solo challenge or a team goal.' },
                        { icon: Trophy, title: 'Play. Cheer. Repeat.', copy: 'Log your activities, follow your progress, and celebrate everyone’s effort.' },
                    ].map(({ icon: Icon, title, copy }, index) => <article className="fg-step" key={title}><div className={`fg-step-visual fg-step-visual-${index}`}><Icon size={42} strokeWidth={1.5} aria-hidden="true" /><span className="fg-step-number">0{index + 1}</span></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
                </div>
            </section>

            <section className="fg-section fg-challenge-section" id="challenges"><div className="fg-container"><div className="fg-heading-row"><div><p className="fg-eyebrow">Find your family’s kind of fun</p><h2>Big fun.<br /><span>Small moves.</span></h2></div><p>From a walk around the block to a living-room challenge, start with something that feels like you.</p></div>
                <div className="fg-challenges">{[
                    { icon: Footprints, name: 'Take it outside', activity: 'Walking', copy: 'Make your next family walk a little more interesting with a shared goal.', style: 'walk' },
                    { icon: Zap, name: 'A little friendly rivalry', activity: 'Squats', copy: 'Choose a goal, take turns, and cheer each other on with every rep.', style: 'squat' },
                    { icon: Sparkles, name: 'Shake up the everyday', activity: 'Jumping jacks', copy: 'Bring a little energy to an ordinary afternoon. A few moves can go a long way.', style: 'jump' },
                ].map(({ icon: Icon, name, activity, copy, style }) => <article className={`fg-challenge fg-challenge-${style}`} key={activity}><div className="fg-challenge-art"><Icon size={64} strokeWidth={1.4} aria-hidden="true" /><span>{activity}</span></div><div className="fg-challenge-copy"><h3>{name}</h3><p>{copy}</p></div></article>)}</div><p className="fg-catalog-note">Ideas using activities in FamiliGo. Parents choose goals suitable for their family.</p>
            </div></section>

            <section className="fg-section" id="for-parents"><div className="fg-container fg-parents-grid"><div className="fg-family-panel"><div className="fg-family-symbol" aria-hidden="true"><Heart size={76} strokeWidth={1.3} /></div><p>More together.<br /><span>One move at a time.</span></p><div className="fg-family-pill"><Users size={17} aria-hidden="true" /> Your family. Your starting line.</div></div><div><p className="fg-eyebrow">Made for families. Led by parents.</p><h2>You bring the family.<br /><span>We bring the fun.</span></h2><p className="fg-section-intro">Family activity can feel like play, instead of another thing on your to-do list.</p><ul className="fg-parent-points">{[['A shared moment', 'Turn a few minutes of movement into time spent cheering each other on.'], ['Your pace, your choice', 'Pick activities and goals that fit your schedule, interests, and abilities.'], ['Participation comes first', 'Make space for everyone to try, contribute, and celebrate their effort.']].map(([title, copy]) => <li key={title}><span><Check size={18} aria-hidden="true" /></span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ul><a className="fg-text-link" href="/privacy">Read our privacy policy <ArrowRight size={17} aria-hidden="true" /></a></div></div></section>

            <section className="fg-section fg-faq-section" id="faq"><div className="fg-container fg-faq-grid"><div><p className="fg-eyebrow">A few things you might be wondering</p><h2>Good questions.<br /><span>Simple answers.</span></h2><p className="fg-section-intro">Still curious? We’re here to help.</p><a className="fg-text-link" href="mailto:support@familigo.life">Get in touch <ArrowRight size={17} aria-hidden="true" /></a></div><div className="fg-faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={19} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></div></section>

            <section className="fg-final-section"><div className="fg-container fg-final"><span className="fg-final-star" aria-hidden="true">✦</span><p className="fg-eyebrow">A little movement. A lot more together.</p><h2>Your next family memory<br />could start with a little move.</h2><p>Join the FamiliGo beta. Bring your people.<br />Make room for a little more play.</p><SignupLink className="fg-button-white" /><p className="fg-final-note">Parent accounts are reviewed before beta access is granted.</p></div></section>
        </main>

        <footer className="fg-footer"><div className="fg-container"><div className="fg-footer-top"><div><Brand /><p>Making movement a family adventure.</p></div><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="#challenges">Challenges</a><a href="#for-parents">For parents</a><a href="/faq">FAQ</a><a href="mailto:support@familigo.life">Support</a></nav></div><div className="fg-footer-bottom"><span>© {new Date().getFullYear()} FamiliGo</span><div><a href="/privacy">Privacy policy</a><a href="/delete-account">Account deletion</a><a href="/login">Log in</a></div><span>Made for more together.</span></div></div></footer>
    </div>;
}

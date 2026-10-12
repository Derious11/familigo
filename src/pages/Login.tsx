import { ArrowLeft,ArrowRight,Heart,LoaderCircle } from 'lucide-react';
import MarketingBrand from '../components/MarketingBrand';
import { useAuthForm } from '../hooks/useAuthForm';
import { GoogleIcon } from '../hooks/useEarlyAccessForm';
import { usePageSeo } from '../lib/seo';
import './early-access.css';
import './login.css';
import './marketing-landing.css';

export default function Login() {
    const { email, setEmail, password, setPassword, error, isLoading, handleSubmit, handleGoogleSignIn } = useAuthForm('login');
    usePageSeo({ title: 'Log In | FamiliGo', description: 'Welcome back to FamiliGo. Sign in and get back to your family’s next challenge.', canonicalPath: '/login', noIndex: true });

    return <div className="fg-landing fg-access fg-login-page">
        <a className="fg-skip" href="#login-main">Skip to login</a>
        <header className="fg-header"><div className="fg-container fg-nav">
            <MarketingBrand />
            <a className="fg-access-back" href="/"><ArrowLeft size={16} aria-hidden="true" /><span>Back to the fun</span></a>
        </div></header>
        <main id="login-main" className="fg-container fg-access-grid">
            <section className="fg-access-story" aria-label="Welcome back to FamiliGo">
                <p className="fg-eyebrow"><span className="fg-live-dot" /> Your next family challenge awaits</p>
                <h1>More play.<br /><span>More together.</span></h1>
                <p className="fg-access-intro">Pick up where you left off. Your next shared goal, friendly challenge, or little win is waiting.</p>
                <div className="fg-login-video"><video src="/assets/intro.mp4" width="1280" height="720" controls playsInline preload="metadata" aria-label="FamiliGo introduction video">Your browser does not support video playback. <a href="/assets/intro.mp4">Watch the FamiliGo introduction</a>.</video></div>
                <div className="fg-login-sidekick"><img src="/assets/brand/gogo-thumbs-up.webp" width="1024" height="1536" alt="GoGo giving a cheerful thumbs-up." /><div><Heart size={18} aria-hidden="true" /><p>A little movement.<br /><strong>A lot more together.</strong></p></div></div>
            </section>
            <section className="fg-access-card fg-login-card" aria-labelledby="login-heading">
                <span className="fg-access-beta">WELCOME BACK</span><h2 id="login-heading">Let’s get back<br /><span>to the fun.</span></h2><p className="fg-access-description">Log in to your FamiliGo account to continue your family’s adventure.</p>
                <button className="fg-access-google" type="button" disabled={isLoading} onClick={async () => { if (await handleGoogleSignIn()) window.location.href = '/app'; }}><span aria-hidden="true"><GoogleIcon /></span>Sign in with Google</button>
                <div className="fg-access-divider"><span>or use your email</span></div>
                {error && <p className="fg-access-error fg-access-form-error" role="alert">{error}</p>}
                <form aria-busy={isLoading} onSubmit={async event => { if (await handleSubmit(event)) window.location.href = '/app'; }}>
                    <fieldset disabled={isLoading}>
                        <div className="fg-access-field"><label htmlFor="login-email">Email address</label><input id="login-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={event => setEmail(event.target.value)} /></div>
                        <div className="fg-access-field"><label htmlFor="login-password">Password</label><input id="login-password" name="password" type="password" autoComplete="current-password" placeholder="Your password" required minLength={6} value={password} onChange={event => setPassword(event.target.value)} /></div>
                        <button type="submit" className="fg-button fg-access-submit">{isLoading ? <><LoaderCircle size={18} className="fg-access-spinner" aria-hidden="true" />Signing you in…</> : <>Log In <ArrowRight size={18} aria-hidden="true" /></>}</button>
                    </fieldset>
                </form>
                <p className="fg-login-help">Having trouble signing in? <a href="mailto:support@familigo.life">Get a hand</a></p>
                <p className="fg-access-login">New to FamiliGo? <a href="/early-access?role=parent">Join Early Access</a></p>
                <p className="fg-access-approval">Waiting for beta approval? We’ll email you when your family can start playing.</p>
                <details className="fg-login-mobile-video"><summary>Watch the FamiliGo introduction</summary><video src="/assets/intro.mp4" width="1280" height="720" controls playsInline preload="none" aria-label="FamiliGo introduction video">Your browser does not support video playback. <a href="/assets/intro.mp4">Watch the introduction</a>.</video></details>
            </section>
        </main>
        <footer className="fg-container fg-access-footer"><span>© {new Date().getFullYear()} FamiliGo</span><nav aria-label="Help and privacy"><a href="/privacy">Privacy policy</a><a href="mailto:support@familigo.life">Need a hand?</a></nav></footer>
    </div>;
}

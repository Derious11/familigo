import { ArrowLeft,ArrowRight,Check,CheckCircle2,Heart,LoaderCircle } from 'lucide-react';
import { useEffect,useRef } from 'react';
import MarketingBrand from '../components/MarketingBrand';
import { GoogleIcon,useEarlyAccessForm } from '../hooks/useEarlyAccessForm';
import { usePageSeo } from '../lib/seo';
import './early-access.css';
import './marketing-landing.css';

export default function EarlyAccess() {
    const {
        submitted, loading, parentName, setParentName, parentEmail, setParentEmail,
        parentPassword, setParentPassword, kidCount, setKidCount, kidAges, setKidAges,
        errors, formError, handleGoogleSignIn, handleCreateAccount,
    } = useEarlyAccessForm();
    const form = useRef<HTMLFormElement>(null);
    const successHeading = useRef<HTMLHeadingElement>(null);
    usePageSeo({ title: 'Join Early Access | FamiliGo', description: 'Create your parent account and request access to the FamiliGo beta. A little movement. A lot more together.', canonicalPath: '/early-access', noIndex: true });
    useEffect(() => { form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(); }, [errors]);
    useEffect(() => { if (submitted) successHeading.current?.focus(); }, [submitted]);

    return <div className="fg-landing fg-access">
        <a className="fg-skip" href="#access-main">Skip to account creation</a>
        <header className="fg-header"><div className="fg-container fg-nav">
            <MarketingBrand />
            <a className="fg-access-back" href="/"><ArrowLeft size={16} aria-hidden="true" /><span>Back to the fun</span></a>
        </div></header>
        <main id="access-main" className="fg-container fg-access-grid">
            <section className="fg-access-story" aria-label="Welcome to FamiliGo">
                <p className="fg-eyebrow"><span className="fg-live-dot" /> Your family’s next adventure</p>
                <h1>A little movement.<br /><span>A lot more <br />together.</span></h1>
                <p className="fg-access-intro">Make room for playful challenges, shared goals, and a few more “let’s do that again” moments.</p>
                <div className="fg-access-gogo"><img src="/assets/brand/gogo-thumbs-up.webp" width="1024" height="1536" alt="GoGo, FamiliGo’s cheerful blue mascot, giving a thumbs-up." /><div className="fg-access-gogo-note"><Heart size={17} aria-hidden="true" /><span>Every family has a starting line.<br /><strong>Yours begins together.</strong></span></div></div>
                <div className="fg-access-steps"><p className="fg-eyebrow">Here’s what happens next</p><ol><li><span>1</span>Create your parent account.</li><li><span>2</span>We review beta requests in waves.</li><li><span>3</span>Once approved, add your family and play.</li></ol></div>
            </section>

            {submitted ? <section className="fg-access-card fg-access-success" aria-labelledby="success-heading"><span className="fg-access-success-icon"><CheckCircle2 size={35} aria-hidden="true" /></span><p className="fg-eyebrow">You’re on your way</p><h2 id="success-heading" ref={successHeading} tabIndex={-1}>Your starting line<br />is right here.</h2><p>Your parent account has been created and your beta access request is pending approval.</p><div className="fg-access-next"><h3>What happens next</h3><ul><li><Check size={16} aria-hidden="true" /> We review requests in waves.</li><li><Check size={16} aria-hidden="true" /> You’ll receive an email once approved.</li><li><Check size={16} aria-hidden="true" /> Then you can add your kids and start challenges.</li></ul></div><p className="fg-access-small">Used Google? Sign in the same way next time. Created a password? Keep it safe.</p><a className="fg-button" href="/">Back to FamiliGo <ArrowRight size={18} aria-hidden="true" /></a></section>
            : <section className="fg-access-card" aria-labelledby="access-heading">
                <span className="fg-access-beta">EARLY ACCESS</span><h2 id="access-heading">Bring your family.<br /><span>Start something fun.</span></h2><p className="fg-access-description">Create a parent or guardian account to request beta access. We’ll email you when you’re approved.</p>
                <button className="fg-access-google" onClick={handleGoogleSignIn} disabled={loading} type="button"><span aria-hidden="true"><GoogleIcon /></span>Continue with Google</button>
                <div className="fg-access-divider"><span>or use your email</span></div>
                {formError && <p className="fg-access-error fg-access-form-error" role="alert">{formError}</p>}
                <form ref={form} noValidate aria-busy={loading} onSubmit={event => { event.preventDefault(); void handleCreateAccount(); }}>
                    <fieldset disabled={loading}>
                        <div className="fg-access-field"><label htmlFor="parent-name">Your name</label><input id="parent-name" name="parentName" type="text" autoComplete="name" placeholder="Your full name" required value={parentName} onChange={event => setParentName(event.target.value)} aria-invalid={!!errors.parentName} aria-describedby={errors.parentName ? 'parent-name-error' : undefined} />{errors.parentName && <p id="parent-name-error" className="fg-access-error">{errors.parentName}</p>}</div>
                        <div className="fg-access-field"><label htmlFor="parent-email">Email address</label><input id="parent-email" name="parentEmail" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required value={parentEmail} onChange={event => setParentEmail(event.target.value)} aria-invalid={!!errors.parentEmail} aria-describedby={errors.parentEmail ? 'parent-email-error' : undefined} />{errors.parentEmail && <p id="parent-email-error" className="fg-access-error">{errors.parentEmail}</p>}</div>
                        <div className="fg-access-field"><label htmlFor="parent-password">Create a password</label><input id="parent-password" name="parentPassword" type="password" autoComplete="new-password" placeholder="At least 8 characters" required minLength={8} value={parentPassword} onChange={event => setParentPassword(event.target.value)} aria-invalid={!!errors.parentPassword} aria-describedby={errors.parentPassword ? 'parent-password-error' : 'password-hint'} />{errors.parentPassword ? <p id="parent-password-error" className="fg-access-error">{errors.parentPassword}</p> : <p id="password-hint" className="fg-access-hint">Use at least 8 characters.</p>}</div>
                        <div className="fg-access-fields-row"><div className="fg-access-field"><label htmlFor="kid-count">Number of kids</label><input id="kid-count" name="kidCount" type="number" min="1" step="1" inputMode="numeric" placeholder="e.g. 2" required value={kidCount} onChange={event => setKidCount(event.target.value === '' ? '' : Number(event.target.value))} aria-invalid={!!errors.kidCount} aria-describedby={errors.kidCount ? 'kid-count-error' : undefined} />{errors.kidCount && <p id="kid-count-error" className="fg-access-error">{errors.kidCount}</p>}</div><div className="fg-access-field"><label htmlFor="kid-ages">Kids’ ages <span>(optional)</span></label><input id="kid-ages" name="kidAges" type="text" placeholder="e.g. 9, 12" value={kidAges} onChange={event => setKidAges(event.target.value)} aria-describedby="kid-ages-hint" /><p id="kid-ages-hint" className="fg-access-hint">Ages only, no names needed.</p></div></div>
                        <button type="submit" className="fg-button fg-access-submit">{loading ? <><LoaderCircle size={18} className="fg-access-spinner" aria-hidden="true" />Creating your account…</> : <>Create Account & Request Access <ArrowRight size={17} aria-hidden="true" /></>}</button>
                    </fieldset>
                </form>
                <p className="fg-access-approval">Creating an account requests beta access.<br />Family challenges become available after approval.</p><p className="fg-access-login">Already part of FamiliGo? <a href="/login">Log in</a></p>
            </section>}
        </main>
        <footer className="fg-container fg-access-footer"><span>© {new Date().getFullYear()} FamiliGo</span><nav aria-label="Help and privacy"><a href="/privacy">Privacy policy</a><a href="mailto:support@familigo.life">Need a hand?</a></nav></footer>
    </div>;
}

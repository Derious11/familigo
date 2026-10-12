import AccountStateFrame from './AccountStateFrame';
export default function ErrorState() {
    const content = <><p className="app-eyebrow">Let’s get you back to the fun</p><h1>Something went wrong.</h1><p>We couldn’t load this screen. Reload to try again, or contact us if the problem continues.</p><button className="app-account-primary" onClick={() => window.location.reload()}>Reload FamiliGo</button></>;
    return <AccountStateFrame>{content}</AccountStateFrame>;
}

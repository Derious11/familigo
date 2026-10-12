
export default function AccountStateFrame({ children }: { children: React.ReactNode }) {
    return <div className="app-shell app-account-state"><a href="/" className="app-account-brand"><img src="/assets/brand/wordmark.webp" width="190" height="65" alt="FamiliGo home" /></a><main className="app-account-card">{children}</main><footer><a href="/privacy">Privacy policy</a><a href="mailto:support@familigo.life">Need a hand?</a></footer></div>;
}

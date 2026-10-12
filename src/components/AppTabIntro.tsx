export default function AppTabIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
    return <div className="app-tab-intro"><p className="app-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>;
}

import { useMemo, useState } from 'react';
import { usePageSeo } from '../lib/seo';

// One source for visible answers and structured data.
const faqs = [
    { q: 'What is FamiliGo?', a: 'FamiliGo is a family fitness challenge app for parents, kids, and teens. Create solo challenges and shared team goals, earn XP, follow your private family leaderboard, and cheer each other on.' },
    { q: 'Is FamiliGo competitive?', a: 'Yes! FamiliGo combines friendly family competition with teamwork. Challenge each other, climb your private family leaderboard, and celebrate everyone’s progress. Choose goals that fit your family’s abilities.' },
    { q: 'Do we need to be athletic?', a: 'Not at all. Choose activities and goals appropriate to each person’s abilities. The goal is to participate, improve, and have fun.' },
    { q: 'Is FamiliGo free?', a: 'The current closed beta is free. A parent or guardian creates an account and requests access. Requests are reviewed in waves, and family challenges become available after approval.' },
    { q: 'Can teens participate independently?', a: 'Yes. Teens can complete family challenges on their own schedule while remaining connected to their Family Circle. You do not need to work out at the same time.' },
    { q: 'Does FamiliGo work on iPhone and Android?', a: 'Yes. FamiliGo currently runs as a mobile-friendly web app on iPhone and Android. You can get started without downloading a native app.' },
    { q: 'What makes FamiliGo different?', a: 'FamiliGo is designed around families. It combines solo challenges, shared team goals, private family leaderboards, XP, and encouragement in one parent-led Family Circle.' },
    { q: 'Do we need special equipment?', a: 'Activities such as walking, squats, and jumping jacks can use everyday movement. Check each activity’s instructions and choose an appropriate space and goal before starting.' },
    { q: 'How do we start using FamiliGo?', a: 'Request free beta access by creating a parent account. Once approved, create your Family Circle, invite your family, and post your first challenge. A valid admin invitation can approve access during signup.' },
    { q: 'What about achievements and badges?', a: 'Earn badges for completing challenges, building habits, cheering others on, and shared family wins. View your achievements on your profile and pin up to three favorite earned badges. The homepage shows actual app screens with synthetic demo data.' },
];

export default function FaqPage() {
    const [query, setQuery] = useState('');
    const [openQuestion, setOpenQuestion] = useState<string | null>(faqs[0].q);
    const schema = useMemo(() => ({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    }), []);
    usePageSeo({ title: 'FamiliGo FAQ | Family Fitness App Questions', description: 'Answers about friendly family competition, private leaderboards, free beta access, and fitness challenges for parents, kids, and teens.', canonicalPath: '/faq', jsonLd: schema, noIndex: __FIREBASE_CONFIG__.projectId !== 'familigo-11643' || window.location.hostname.includes('--') });
    const search = query.trim().toLowerCase();
    const filtered = faqs.filter(({ q, a }) => `${q} ${a}`.toLowerCase().includes(search));

    return <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto w-full max-w-3xl px-4 py-12">
            <div className="text-center space-y-3">
                <a href="/" className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-white/80">FamiliGo · Back to home</a>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Healthy competition. Stronger families.</h1>
                <p className="text-white/70">Answers about family fitness challenges, teamwork, and getting started.</p>
            </div>
            <div className="mt-8">
                <label htmlFor="faq-search" className="block text-sm text-white/70 mb-2">Search questions</label>
                <input id="faq-search" value={query} onChange={event => { setQuery(event.target.value); setOpenQuestion(null); }} placeholder="Try: free, leaderboard, iPhone, teens…" className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline focus:outline-2 focus:outline-blue-400" />
            </div>
            <div className="mt-8 space-y-3">
                {filtered.length === 0 && <p className="p-6 text-white/70" role="status">No matches. Try “free”, “parents”, or “challenges”.</p>}
                {filtered.map(({ q, a }) => {
                    const index = faqs.findIndex(item => item.q === q);
                    return <div key={q} className="rounded-2xl border border-white/10 bg-white/5">
                        <button type="button" id={`faq-question-${index}`} onClick={() => setOpenQuestion(openQuestion === q ? null : q)} aria-expanded={openQuestion === q} aria-controls={`faq-answer-${index}`} className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 rounded-2xl">{q}<span aria-hidden="true">{openQuestion === q ? '−' : '+'}</span></button>
                        <div id={`faq-answer-${index}`} hidden={openQuestion !== q} aria-labelledby={`faq-question-${index}`} className="px-5 pb-5 text-sm leading-6 text-white/80">{a}</div>
                    </div>;
                })}
            </div>
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold">Ready to challenge your family?</h2>
                <p className="mt-2 text-sm text-white/70">Create a parent account to request free beta access. Once approved, bring your family together for your first challenge.</p>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <a href="/early-access?role=parent" className="inline-flex items-center justify-center rounded-2xl bg-white text-slate-950 px-5 py-3 text-sm font-semibold">Request Free Beta Access</a>
                    <a href="/#for-parents" className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold">For parents</a>
                </div>
            </div>
        </section>
    </main>;
}

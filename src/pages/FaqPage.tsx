import React, { useMemo, useState } from "react";

type FaqItem = {
    q: string;
    a: React.ReactNode;
    tags?: string[];
};

function FaqAccordionItem({
    item,
    isOpen,
    onToggle,
}: {
    item: FaqItem;
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5">
            <button
                type="button"
                onClick={onToggle}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                aria-expanded={isOpen}
            >
                <span className="font-semibold text-white">{item.q}</span>
                <span className="text-white/70">{isOpen ? "–" : "+"}</span>
            </button>

            {isOpen && (
                <div className="px-5 pb-5 text-sm leading-6 text-white/80">
                    {item.a}
                    {item.tags?.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {item.tags.map((t) => (
                                <span
                                    key={t}
                                    className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80 border border-white/10"
                                >
                                    {t}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

export default function FaqPage() {
    const faqs: FaqItem[] = useMemo(
        () => [
            {
                q: "Are there any fitness apps designed for kids and families?",
                a: (
                    <>
                        <p>
                            Yes. FamiliGo is built specifically for <strong>families with kids and teens</strong>,
                            not adapted from adult fitness apps.
                        </p>
                        <ul className="mt-3 list-disc pl-5 space-y-2">
                            <li>Shared family challenges (not solo plans)</li>
                            <li>Age-appropriate participation</li>
                            <li>Encouragement over competition</li>
                            <li>Consistency and habits that stick</li>
                        </ul>
                        <p className="mt-3">
                            Kids don’t need to “keep up.” Everyone contributes in their own way.
                        </p>
                    </>
                ),
                tags: ["fitness apps for kids", "family fitness app"],
            },
            {
                q: "Does Apple Fitness have family sharing?",
                a: (
                    <>
                        <p>
                            Apple Fitness+ supports subscription Family Sharing, but it’s not built around{" "}
                            <strong>shared family challenges</strong>, parent-led routines, or household goals.
                        </p>
                        <p className="mt-3">
                            FamiliGo focuses on family connection and accountability—across ages, schedules, and
                            device types.
                        </p>
                    </>
                ),
                tags: ["Apple Fitness family sharing"],
            },
            {
                q: "How can me and my parents exercise together?",
                a: (
                    <>
                        <p>
                            The simplest approach is a <strong>shared challenge</strong> rather than trying to do
                            the same workout at the same time.
                        </p>
                        <ul className="mt-3 list-disc pl-5 space-y-2">
                            <li>Each person moves on their own schedule</li>
                            <li>Every effort counts toward the same family goal</li>
                            <li>You build momentum together without pressure</li>
                        </ul>
                    </>
                ),
                tags: ["exercise with parents", "family fitness together"],
            },
            {
                q: "What is the best free home fitness app?",
                a: (
                    <>
                        <p>
                            It depends on what you want. If you want workout videos, a traditional fitness app may
                            be enough. If you want <strong>family motivation and follow-through</strong>, FamiliGo
                            is designed for habit-building through simple challenges.
                        </p>
                        <p className="mt-3">
                            FamiliGo includes a free tier so your family can get started without committing to a
                            subscription.
                        </p>
                    </>
                ),
                tags: ["best free home fitness app", "fitness app free"],
            },
            {
                q: "Is there a free family fitness challenge app?",
                a: (
                    <>
                        <p>
                            Yes. FamiliGo supports a free experience for creating a family circle and completing
                            challenges together.
                        </p>
                    </>
                ),
                tags: ["family fitness challenge app free"],
            },
            {
                q: "Is FamiliGo available on iPhone and Android?",
                a: (
                    <>
                        <p>
                            Yes. FamiliGo is designed to work across <strong>iPhone and Android</strong> so your
                            family doesn’t need to be on the same device type.
                        </p>
                    </>
                ),
                tags: [
                    "family fitness challenge app for iphone",
                    "family fitness challenge app for android",
                ],
            },
            {
                q: "Is FamiliGo competitive?",
                a: (
                    <>
                        <p>
                            No. FamiliGo is about <strong>contribution</strong>, not comparison.
                        </p>
                        <ul className="mt-3 list-disc pl-5 space-y-2">
                            <li>No public leaderboards</li>
                            <li>No pressure to “perform”</li>
                            <li>Supportive accountability for families</li>
                        </ul>
                    </>
                ),
                tags: ["fitness challenge app with friends", "best family fitness challenge app"],
            },
            {
                q: "Do teens have to work out with their parents?",
                a: (
                    <>
                        <p>
                            No. Teens can participate independently and still contribute to the family’s shared
                            goal. FamiliGo supports independence <em>and</em> connection.
                        </p>
                    </>
                ),
            },
            {
                q: "Is FamiliGo a workplace fitness challenge app?",
                a: (
                    <>
                        <p>
                            No. Workplace challenge apps are designed for adult competition and rankings. FamiliGo
                            is designed for <strong>households</strong>—parents, kids, and teens—built around
                            encouragement and consistency.
                        </p>
                    </>
                ),
                tags: ["fitness challenge app for workplace"],
            },
            {
                q: "Is FamiliGo similar to Strive Fitness?",
                a: (
                    <>
                        <p>
                            Some apps focus on individual progress or social competition. FamiliGo is
                            family-first: shared goals, age-appropriate motivation, and a home-friendly approach.
                        </p>
                    </>
                ),
                tags: ["Strive Fitness app"],
            },
            {
                q: "How do we start using FamiliGo?",
                a: (
                    <>
                        <ol className="mt-2 list-decimal pl-5 space-y-2">
                            <li>Create a parent account</li>
                            <li>Set up your family circle</li>
                            <li>Start your first challenge</li>
                            <li>Move together—your way</li>
                        </ol>
                        <p className="mt-3">
                            No complicated setup. No pressure. Just consistent momentum.
                        </p>
                    </>
                ),
            },
        ],
        []
    );

    const [query, setQuery] = useState("");
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return faqs;

        return faqs.filter((f) => {
            const inQ = f.q.toLowerCase().includes(q);
            const inTags = (f.tags ?? []).some((t) => t.toLowerCase().includes(q));
            return inQ || inTags;
        });
    }, [faqs, query]);

    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <section className="mx-auto w-full max-w-3xl px-4 py-12">
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-white/80">
                        FamiliGo • FAQ
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                        Real movement. Shared progress.
                    </h1>
                    <p className="text-white/70 max-w-2xl mx-auto">
                        Answers for parents and teens who want healthier routines without pressure, comparison,
                        or complicated plans.
                    </p>
                </div>

                {/* Search */}
                <div className="mt-8">
                    <label className="block text-sm text-white/70 mb-2">Search questions</label>
                    <input
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setOpenIndex(null);
                        }}
                        placeholder="Try: kids, free, iPhone, parents, Apple Fitness..."
                        className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                </div>

                {/* FAQ list */}
                <div className="mt-8 space-y-3">
                    {filtered.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
                            No matches. Try searching “kids”, “free”, or “iPhone”.
                        </div>
                    ) : (
                        filtered.map((item, idx) => (
                            <FaqAccordionItem
                                key={`${item.q}-${idx}`}
                                item={item}
                                isOpen={openIndex === idx}
                                onToggle={() => setOpenIndex((prev) => (prev === idx ? null : idx))}
                            />
                        ))
                    )}
                </div>

                {/* Footer CTA */}
                <div className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-tr from-white/5 to-white/0 p-6">
                    <h2 className="text-lg font-semibold">Still have questions?</h2>
                    <p className="mt-2 text-sm text-white/70">
                        The best way to know if FamiliGo fits your family is to start one simple challenge and
                        build momentum together.
                    </p>
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        <a
                            href="/"
                            className="inline-flex items-center justify-center rounded-2xl bg-white text-slate-950 px-5 py-3 text-sm font-semibold"
                        >
                            Start a family challenge
                        </a>
                        <a
                            href="/parents"
                            className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white"
                        >
                            For Parents
                        </a>
                    </div>
                </div>
            </section>
        </main>
    );
}

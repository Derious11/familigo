import { ShieldCheck, Trophy, Flame, Users, CheckCircle2 } from "lucide-react";

export default function ParentsLanding() {
    const goToEarlyAccess = () => {
        localStorage.setItem("familiGoRole", "parent");
        window.location.href = "/early-access?role=parent";
    };

    return (
        <main className="min-h-screen bg-slate-950 text-white">
            {/* =========================
          HERO SECTION
      ========================== */}
            <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,_#22c55e1a,_transparent_55%),radial-gradient(circle_at_bottom,_#4f46e51f,_transparent_55%)]">
                <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:px-6">

                    {/* LEFT: COPY */}
                    <article className="space-y-6">
                        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-slate-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                            Built for Modern Families
                        </p>

                        <header className="space-y-4">
                            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                                Turn screen time into{" "}
                                <span className="text-emerald-400">fit time</span> — without the nagging.
                            </h1>

                            <p className="max-w-xl text-sm text-slate-300 sm:text-base">
                                FamiliGo is a private, family-first fitness app that turns movement into a
                                game. Streaks, XP, and friendly competition motivate your kids—so you don’t
                                have to argue, beg, or micromanage.
                            </p>
                        </header>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={goToEarlyAccess}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-indigo-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg transition hover:brightness-110"
                            >
                                Join the Family Beta
                            </button>

                            <button
                                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/80 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
                            >
                                See How It Works
                            </button>
                        </div>

                        <ul className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-300">
                            <li className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                Private, invite-only family circle
                            </li>
                            <li className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                Weekly reset leaderboards
                            </li>
                            <li className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                Built as a safe social network for kids
                            </li>
                        </ul>
                    </article>

                    {/* RIGHT: VISUAL PLACEHOLDER */}
                    <aside className="relative flex justify-center">
                        <div className="relative h-[420px] w-full max-w-sm rounded-3xl bg-gradient-to-br from-emerald-500/20 via-sky-500/10 to-indigo-500/30 p-[1px]">
                            <div className="h-full rounded-[1.4rem] bg-slate-950/90 backdrop-blur p-4 flex flex-col justify-between">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                                    Live Family Snapshot
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 rounded-2xl bg-slate-800 p-3">
                                        <Flame className="h-5 w-5 text-emerald-400" />
                                        <div>
                                            <p className="text-sm font-semibold">Dad logged a workout</p>
                                            <p className="text-xs text-slate-400">Streak Day 5 • +30 XP</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 rounded-2xl bg-slate-800 p-3">
                                        <Trophy className="h-5 w-5 text-yellow-300" />
                                        <div>
                                            <p className="text-sm font-semibold">Weekly Legends Podium</p>
                                            <p className="text-xs text-slate-400">Gold: Alex • 2,140 XP</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 rounded-2xl bg-slate-800 p-3">
                                        <ShieldCheck className="h-5 w-5 text-indigo-400" />
                                        <div>
                                            <p className="text-sm font-semibold">Private Family Feed</p>
                                            <p className="text-xs text-slate-400">Invite-only access</p>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[10px] text-slate-400">
                                    No public profiles. No strangers. Just your family.
                                </p>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>

            {/* =========================
          NO MORE NAGGING
      ========================== */}
            <section id="how-it-works" className="border-b border-white/10 bg-slate-950">
                <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 grid gap-8 md:grid-cols-2">
                    <article className="space-y-4">
                        <h2 className="text-2xl font-semibold">
                            No more nagging. Let the game do the encouraging!
                        </h2>
                        <p className="text-sm text-slate-300">
                            FamiliGo turns fitness into visible progress. Instead of asking
                            “Did you work out?”, your kids see their streaks, XP, and rank falling behind.
                        </p>
                        <p className="text-sm text-slate-400">
                            Motivation shifts from parent pressure to game-driven accountability.
                        </p>
                    </article>

                    <aside className="rounded-3xl bg-slate-900 p-5 ring-1 ring-white/5 space-y-4">
                        <p className="text-xs uppercase tracking-wide text-emerald-300">
                            From a beta parent
                        </p>
                        <p className="text-sm text-slate-200">
                            “Before FamiliGo I begged my son to go outside. Now he reminds me he needs to
                            keep his streak alive.”
                        </p>
                        <p className="text-xs text-slate-400">
                            — Parent of a 13-year-old
                        </p>
                    </aside>
                </div>
            </section>

            {/* =========================
          FEATURES
      ========================== */}
            <section className="border-b border-white/10 bg-slate-950">
                <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 grid gap-8 md:grid-cols-3">
                    <Feature
                        icon={<Flame className="h-6 w-6 text-emerald-400" />}
                        title="Daily Challenges"
                        text="Create simple movement challenges like pushups, walks, or stairs. Kids post photo proof to complete them."
                    />
                    <Feature
                        icon={<Trophy className="h-6 w-6 text-yellow-300" />}
                        title="Weekly Legends Podium"
                        text="Every week resets the leaderboard. This keeps competition healthy and consistent—not extreme."
                    />
                    <Feature
                        icon={<ShieldCheck className="h-6 w-6 text-indigo-400" />}
                        title="Private Family Network"
                        text="No public feeds. No strangers. Parents control access and visibility."
                    />
                </div>
            </section>

            {/* =========================
          CTA
      ========================== */}
            <section className="bg-slate-950 py-16 text-center">
                <h2 className="mb-4 text-2xl font-semibold">
                    Build strong habits together.
                </h2>
                <p className="mb-6 text-sm text-slate-300">
                    Join the FamiliGo Early Access program and help shape the future of family fitness.
                </p>
                <button
                    onClick={goToEarlyAccess}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-indigo-500 px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg transition hover:brightness-110"
                >
                    Request Early Access
                </button>
            </section>
        </main>
    );
}

/* =========================
   FEATURE BLOCK COMPONENT
========================== */
function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
    return (
        <article className="rounded-3xl bg-slate-900 p-5 ring-1 ring-white/5 space-y-3">
            <div>{icon}</div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-slate-300">{text}</p>
        </article>
    );
}

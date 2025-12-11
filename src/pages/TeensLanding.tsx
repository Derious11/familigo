import { Flame, Trophy, Users, Zap, CheckCircle2, Swords } from "lucide-react";

export default function TeensLanding() {
    const goToEarlyAccess = () => {
        localStorage.setItem("familiGoRole", "teen");
        window.location.href = "/early-access?role=teen";
    };

    return (
        <main className="min-h-screen bg-slate-950 text-white">
            {/* =========================
          HERO SECTION
      ========================== */}
            <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,_#4f46e51f,_transparent_55%),radial-gradient(circle_at_bottom,_#22c55e1a,_transparent_55%)]">
                <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:px-6">

                    {/* LEFT: COPY */}
                    <article className="space-y-6">
                        <p className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-slate-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-200">
                            Built to Compete
                        </p>

                        <header className="space-y-4">
                            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                                Beat your parents.
                                <span className="block text-emerald-400">Own the leaderboard.</span>
                            </h1>

                            <p className="max-w-xl text-sm text-slate-300 sm:text-base">
                                FamiliGo turns workouts into a game. Streaks, XP, and weekly podiums
                                decide who really runs the house. Call out your parents. Challenge
                                your friends. Stack wins.
                            </p>
                        </header>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={goToEarlyAccess}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-400 via-indigo-500 to-emerald-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg transition hover:brightness-110"
                            >
                                Start Your Streak
                            </button>

                            <button
                                onClick={() => (window.location.href = "/teens#how-it-works")}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/80 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
                            >
                                See How It Works
                            </button>
                        </div>

                        <ul className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-300">
                            <li className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                                Weekly Legends podium
                            </li>
                            <li className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                                Streaks + XP + Level ups
                            </li>
                            <li className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                                Private family competition
                            </li>
                        </ul>
                    </article>

                    {/* RIGHT: VISUAL PLACEHOLDER */}
                    <aside className="relative flex justify-center">
                        <div className="relative h-[420px] w-full max-w-sm rounded-3xl bg-gradient-to-br from-indigo-500/25 via-sky-500/10 to-emerald-500/30 p-[1px]">
                            <div className="h-full rounded-[1.4rem] bg-slate-950/90 backdrop-blur p-4 flex flex-col justify-between">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
                                    Live Battle Snapshot
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 rounded-2xl bg-slate-800 p-3">
                                        <Flame className="h-5 w-5 text-emerald-400" />
                                        <div>
                                            <p className="text-sm font-semibold">Streak Active</p>
                                            <p className="text-xs text-slate-400">Day 7 • You’re on fire</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 rounded-2xl bg-slate-800 p-3">
                                        <Trophy className="h-5 w-5 text-yellow-300" />
                                        <div>
                                            <p className="text-sm font-semibold">You’re in 1st Place</p>
                                            <p className="text-xs text-slate-400">2,480 XP • Weekly Legend</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 rounded-2xl bg-slate-800 p-3">
                                        <Zap className="h-5 w-5 text-indigo-400" />
                                        <div>
                                            <p className="text-sm font-semibold">Dad Just Logged XP</p>
                                            <p className="text-xs text-slate-400">He’s coming for you</p>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-[10px] text-slate-400">
                                    Every rep moves the leaderboard.
                                </p>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>

            {/* =========================
          DOMINANCE SECTION
      ========================== */}
            <section className="border-b border-white/10 bg-slate-950" id="how-it-works">
                <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 grid gap-8 md:grid-cols-2">
                    <article className="space-y-4">
                        <h2 className="text-2xl font-semibold">
                            Call out your parents. Win in real life.
                        </h2>
                        <p className="text-sm text-slate-300">
                            Create challenges like pushups, stairs, steps, or runs. Everyone has
                            to post proof. The leaderboard doesn’t lie.
                        </p>
                        <p className="text-sm text-slate-400">
                            You don’t need permission to dominate—just consistency.
                        </p>
                    </article>

                    <aside className="rounded-3xl bg-slate-900 p-5 ring-1 ring-white/5 space-y-4">
                        <p className="text-xs uppercase tracking-wide text-indigo-300">
                            Beta Teen Feedback
                        </p>
                        <p className="text-sm text-slate-200">
                            “My dad thought he had me in pushups. I beat him by 120 XP.
                            Now he trains at lunch.”
                        </p>
                        <p className="text-xs text-slate-400">
                            — Age 15, Weekly Legend
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
                        title="Streaks That Matter"
                        text="Miss a day and you fall behind. Stack streaks and everyone sees it."
                    />
                    <Feature
                        icon={<Trophy className="h-6 w-6 text-yellow-300" />}
                        title="Weekly Legends Podium"
                        text="Every week resets the leaderboard. Fresh start. New champion."
                    />
                    <Feature
                        icon={<Swords className="h-6 w-6 text-indigo-400" />}
                        title="Battles & Squads (Coming Soon)"
                        text="Head-to-head battles and family-vs-family squads are unlocking soon."
                    />
                </div>
            </section>

            {/* =========================
          CTA
      ========================== */}
            <section className="bg-slate-950 py-16 text-center">
                <h2 className="mb-4 text-2xl font-semibold">
                    Ready to run this house?
                </h2>
                <p className="mb-6 text-sm text-slate-300">
                    Get early access, start your streak, and challenge your parents.
                </p>
                <button
                    onClick={goToEarlyAccess}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-400 via-indigo-500 to-emerald-500 px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg transition hover:brightness-110"
                >
                    Claim Your Spot
                </button>
            </section>
        </main>
    );
}

/* =========================
   FEATURE BLOCK COMPONENT
========================== */
function Feature({
    icon,
    title,
    text,
}: {
    icon: React.ReactNode;
    title: string;
    text: string;
}) {
    return (
        <article className="rounded-3xl bg-slate-900 p-5 ring-1 ring-white/5 space-y-3">
            <div>{icon}</div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-slate-300">{text}</p>
        </article>
    );
}

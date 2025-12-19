import {
    Flame,
    Trophy,
    Zap,
    CheckCircle2,
    Swords,
    MessageCircle,
} from "lucide-react";

export default function TeensLanding() {
    const goToInviteParent = () => {
        localStorage.setItem("familiGoRole", "teen");
        window.location.href = "/invite-parent";
    };

    const shareViaText = () => {
        const message =
            "I found this app called FamiliGo. It turns workouts into a family competition with streaks and leaderboards. I want to challenge you 😈💪\n\nCheck it out here:\nhttps://familigo.life/invite-parent";

        window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
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
                                <span className="block text-emerald-400">
                                    Own the leaderboard.
                                </span>
                            </h1>

                            <p className="max-w-xl text-sm text-slate-300 sm:text-base">
                                FamiliGo turns workouts into a real competition.
                                Streaks, XP, and weekly podiums decide who actually
                                runs the house.
                            </p>
                        </header>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={goToInviteParent}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-400 via-indigo-500 to-emerald-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg transition hover:brightness-110"
                            >
                                Invite Your Parent
                            </button>

                            <button
                                onClick={() =>
                                    document
                                        .getElementById("how-you-win")
                                        ?.scrollIntoView({ behavior: "smooth" })
                                }
                                className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/80 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 transition hover:border-slate-500 hover:bg-slate-900"
                            >
                                See How You Win
                            </button>
                        </div>

                        <ul className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-300">
                            <li className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                                Private family competition
                            </li>
                            <li className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                                No social feeds or strangers
                            </li>
                            <li className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                                Parent-approved only
                            </li>
                        </ul>
                    </article>

                    {/* RIGHT: VISUAL */}
                    <aside className="relative flex justify-center">
                        <div className="relative h-[420px] w-full max-w-sm rounded-3xl bg-gradient-to-br from-indigo-500/25 via-sky-500/10 to-emerald-500/30 p-[1px]">
                            <div className="h-full rounded-[1.4rem] bg-slate-950/90 backdrop-blur p-4 flex flex-col justify-between">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
                                    Live Battle Snapshot
                                </p>

                                <div className="space-y-3">
                                    <Snapshot
                                        icon={<Flame className="h-5 w-5 text-emerald-400" />}
                                        title="Streak Active"
                                        subtitle="Day 7 • You’re on fire"
                                    />
                                    <Snapshot
                                        icon={<Trophy className="h-5 w-5 text-yellow-300" />}
                                        title="You’re in 1st Place"
                                        subtitle="Weekly Legend"
                                    />
                                    <Snapshot
                                        icon={<Zap className="h-5 w-5 text-indigo-400" />}
                                        title="Parent Logged XP"
                                        subtitle="They’re chasing you"
                                    />
                                </div>

                                <p className="text-[10px] text-slate-400">
                                    Every workout changes the leaderboard.
                                </p>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>

            {/* =========================
               HOW YOU WIN
            ========================== */}
            <section
                id="how-you-win"
                className="border-t border-white/10 bg-slate-950"
            >
                <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
                    <header className="mb-10 text-center space-y-3">
                        <h2 className="text-2xl md:text-3xl font-semibold">
                            Here’s how you win.
                        </h2>
                        <p className="text-sm text-slate-300 max-w-xl mx-auto">
                            No likes. No followers. Just real workouts and real
                            bragging rights.
                        </p>
                    </header>

                    <div className="grid gap-6 md:grid-cols-3">
                        <WinStep
                            icon={<Swords className="h-6 w-6 text-indigo-400" />}
                            title="Pick the challenge"
                            text="Pushups, steps, runs, stairs — you choose the battle."
                        />
                        <WinStep
                            icon={<Zap className="h-6 w-6 text-emerald-400" />}
                            title="Earn XP & streaks"
                            text="Log workouts, upload proof, and stack points."
                        />
                        <WinStep
                            icon={<Trophy className="h-6 w-6 text-yellow-300" />}
                            title="Win the week"
                            text="Weekly podiums reset. Beat them again. And again."
                        />
                    </div>

                    <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4">
                        <button
                            onClick={shareViaText}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-800 hover:bg-slate-700 px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Share via Text
                        </button>

                        <button
                            onClick={goToInviteParent}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-400 via-indigo-500 to-emerald-500 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg transition hover:brightness-110"
                        >
                            Invite Your Parent
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}

/* =========================
   COMPONENTS
========================== */

function Snapshot({
    icon,
    title,
    subtitle,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-800 p-3">
            {icon}
            <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
        </div>
    );
}

function WinStep({
    icon,
    title,
    text,
}: {
    icon: React.ReactNode;
    title: string;
    text: string;
}) {
    return (
        <div className="rounded-3xl bg-slate-900 p-6 ring-1 ring-white/5 text-center space-y-3">
            <div className="flex justify-center">{icon}</div>
            <h3 className="text-sm font-semibold uppercase tracking-wide">
                {title}
            </h3>
            <p className="text-sm text-slate-300">{text}</p>
        </div>
    );
}

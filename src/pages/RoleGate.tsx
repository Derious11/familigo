import { Users, Trophy, LogIn } from "lucide-react";
import { useEffect } from "react";

export default function RoleGate() {

    // If a user is already authenticated, redirect them into the app.
    // This prevents logged-in users from going “back” to the role marketing page.
    useEffect(() => {
        const storedAuth = localStorage.getItem("firebaseAuthToken");
        if (storedAuth) {
            window.location.href = "/app";
        }
    }, []);

    const selectRole = (role: "parent" | "teen") => {
        localStorage.setItem("familiGoRole", role);
        window.location.href = role === "parent" ? "/parents" : "/teens";
    };

    return (
        <main className="min-h-screen bg-slate-950 text-white flex flex-col">

            {/* ------------------------------------------------------------------
               TOP NAV – Minimal, clean, professional
            ------------------------------------------------------------------ */}
            <header className="w-full flex items-center justify-between py-4 px-6">
                {/* Brand */}
                <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-indigo-500 flex items-center justify-center shadow-lg">
                        <Users className="h-5 w-5 text-slate-950" />
                    </div>
                    <span className="font-semibold tracking-wide">FamiliGo</span>
                </div>

                {/* Login Button */}
                <a
                    href="/login"
                    className="flex items-center gap-1 text-sm text-slate-300 hover:text-white transition"
                >
                    <LogIn className="h-4 w-4" />
                    Login
                </a>
            </header>

            {/* ------------------------------------------------------------------
               CENTER CONTENT
            ------------------------------------------------------------------ */}
            <section className="flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-md text-center space-y-8">

                    {/* Brand Hero */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-400 to-indigo-500 flex items-center justify-center shadow-xl">
                            <Users className="h-7 w-7 text-slate-950" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">FamiliGo</h1>
                        <p className="text-xs text-slate-400 tracking-wide uppercase">
                            Family Fitness • Gamified Motivation
                        </p>
                    </div>

                    {/* Core Question */}
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold tracking-tight">
                            Who’s checking this out today?
                        </h2>
                        <p className="text-sm text-slate-300">
                            Pick the experience made specifically for you.
                        </p>
                    </div>

                    {/* Role Buttons */}
                    <div className="grid gap-4 pt-4">

                        {/* Parent */}
                        <button
                            onClick={() => selectRole("parent")}
                            className="group flex items-center justify-between rounded-2xl border border-emerald-400/30 bg-slate-900 px-5 py-5 text-left transition hover:border-emerald-400 hover:bg-slate-900/70"
                        >
                            <div>
                                <p className="text-base font-semibold">I’m a Parent</p>
                                <p className="text-xs text-slate-400">
                                    Safety, habits, healthy routines, family guidance
                                </p>
                            </div>
                            <span className="text-sm font-bold text-emerald-400 group-hover:translate-x-1 transition">
                                →
                            </span>
                        </button>

                        {/* Teen */}
                        <button
                            onClick={() => selectRole("teen")}
                            className="group flex items-center justify-between rounded-2xl border border-indigo-400/30 bg-slate-900 px-5 py-5 text-left transition hover:border-indigo-400 hover:bg-slate-900/70"
                        >
                            <div className="flex items-center gap-3">
                                <Trophy className="h-6 w-6 text-indigo-400" />
                                <div>
                                    <p className="text-base font-semibold">I’m a Teen</p>
                                    <p className="text-xs text-slate-400">
                                        Streaks, friendly competition, leaderboards
                                    </p>
                                </div>
                            </div>
                            <span className="text-sm font-bold text-indigo-400 group-hover:translate-x-1 transition">
                                →
                            </span>
                        </button>
                    </div>

                    {/* Footer */}
                    <p className="pt-6 text-[11px] text-slate-500 leading-relaxed">
                        Invite-only. Family-first. Built for safe, positive competition.
                    </p>
                </div>
            </section>

        </main>
    );
}

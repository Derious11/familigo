import { ShieldCheck, Users, Trophy, CheckCircle2, Mail } from "lucide-react";

export default function InviteParent() {
    return (
        <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
            <section className="max-w-xl w-full rounded-3xl bg-slate-900 p-8 ring-1 ring-white/5 space-y-8">
                {/* Header */}
                <header className="text-center space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-indigo-500 flex items-center justify-center shadow-lg">
                        <Users className="h-6 w-6 text-slate-950" />
                    </div>

                    <h1 className="text-2xl font-semibold">
                        This is a family game.
                    </h1>

                    <p className="text-sm text-slate-300">
                        FamiliGo works best when parents and kids play together.
                        A parent creates the family account and decides who joins.
                    </p>
                </header>

                {/* Trust Block */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <TrustItem
                        icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
                        title="Parent Controlled"
                        text="Parents approve family members and challenges."
                    />
                    <TrustItem
                        icon={<Users className="h-5 w-5 text-indigo-400" />}
                        title="Private by Design"
                        text="No public feeds. No strangers. Family-only play."
                    />
                    <TrustItem
                        icon={<Trophy className="h-5 w-5 text-yellow-300" />}
                        title="Healthy Competition"
                        text="Fitness-focused challenges that build consistency."
                    />
                    <TrustItem
                        icon={<CheckCircle2 className="h-5 w-5 text-sky-400" />}
                        title="Built for Families"
                        text="Designed to motivate without turning into screen time."
                    />
                </div>

                {/* Primary Actions */}
                <div className="space-y-4">
                    <button
                        onClick={() => (window.location.href = "/early-access")}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-indigo-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg transition hover:brightness-110"
                    >
                        Create Parent Account
                    </button>

                    <p className="text-center text-xs text-slate-400">
                        Parents must approve access before anyone can play.
                    </p>

                    <Divider />

                    {/* Optional invite email */}
                    <div className="rounded-2xl bg-slate-800 p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                            Not together right now?
                        </p>
                        <p className="text-xs text-slate-400">
                            Send this page to your parent so they can review and decide.
                        </p>

                        <button
                            onClick={() => navigator.share?.({
                                title: "FamiliGo – Family Fitness Game",
                                url: window.location.origin + "/invite-parent",
                            })}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:border-slate-500"
                        >
                            <Mail className="h-4 w-4" />
                            Share With Parent
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}

function TrustItem({
    icon,
    title,
    text,
}: {
    icon: React.ReactNode;
    title: string;
    text: string;
}) {
    return (
        <div className="flex gap-3 rounded-2xl bg-slate-800 p-4">
            <div>{icon}</div>
            <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-slate-400">{text}</p>
            </div>
        </div>
    );
}

function Divider() {
    return (
        <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500">Or</span>
            </div>
        </div>
    );
}

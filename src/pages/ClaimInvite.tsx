import { useEffect, useState } from "react";
import { usePostHog } from 'posthog-js/react';
import { ShieldCheck, User, Mail, Lock, Calendar, CheckCircle2 } from "lucide-react";
import { signUpWithEmail } from "../services/authService";
import { getFunctions, httpsCallable } from "firebase/functions";

/* =========================
   Types
========================= */

interface InviteInfo {
    familyName: string;
    familyCircleId: string;
}

/* =========================
   Page
========================= */

export default function ClaimInvite() {
    const posthog = usePostHog();
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [invite, setInvite] = useState<InviteInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [birthDate, setBirthDate] = useState("");

    /* =========================
       Load + Validate Invite
    ========================== */

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        setInviteCode(code);

        if (!code) {
            setError("Invalid or missing invite code.");
            setLoading(false);
            return;
        }

        const fetchInvite = async () => {
            try {
                const functions = getFunctions();
                const validateInvite = httpsCallable(functions, "validateTeenInvite");

                const result: any = await validateInvite({ code });

                setInvite({
                    familyName: result.data.familyName,
                    familyCircleId: result.data.familyCircleId,
                });
            } catch (err) {
                console.error(err);
                setError("This invite is no longer valid.");
            } finally {
                setLoading(false);
            }
        };

        fetchInvite();
    }, []);

    /* =========================
       Helpers
    ========================== */

    const is13OrOlder = () => {
        if (!birthDate) return false;
        const dob = new Date(birthDate);
        const ageDifMs = Date.now() - dob.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970) >= 13;
    };

    /* =========================
       Submit
    ========================== */

    const handleSubmit = async () => {
        setError(null);

        if (!name || !email || !password || !birthDate) {
            setError("Please complete all fields.");
            return;
        }

        if (!is13OrOlder()) {
            setError("You must be at least 13 years old to create an account.");
            return;
        }

        if (!invite || !inviteCode) {
            setError("Invite validation failed.");
            return;
        }

        setSubmitting(true);
        try {
            await signUpWithEmail(
                name,
                email,
                password,
                "teen",
                new Date(birthDate),
                undefined,
                {
                    invitedBy: "family-invite",
                }
            );

            posthog?.group('family', invite.familyCircleId);

            posthog?.capture('teen_invite_accepted', {
                $groups: { family: invite.familyCircleId },
                family_id: invite.familyCircleId,
                role: 'teen',
                invite_source: 'email_link'
            });

            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to create account.");
        } finally {
            setSubmitting(false);
        }
    };

    /* =========================
       STATES
    ========================== */

    if (loading) {
        return (
            <Centered>
                <Spinner />
            </Centered>
        );
    }

    if (error) {
        return (
            <Centered>
                <ErrorCard message={error} />
            </Centered>
        );
    }

    if (success) {
        return (
            <Centered>
                <div className="max-w-md w-full bg-slate-900 p-8 rounded-3xl text-center ring-1 ring-white/10">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400 mb-4" />
                    <h1 className="text-xl font-semibold mb-2">You’re In!</h1>
                    <p className="text-sm text-slate-300 mb-6">
                        Your account has been created and linked to{" "}
                        <span className="font-semibold">{invite?.familyName}</span>.
                    </p>
                    <button
                        onClick={() => (window.location.href = "/app")}
                        className="rounded-full bg-gradient-to-r from-emerald-400 to-indigo-500 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950"
                    >
                        Enter FamiliGo
                    </button>
                </div>
            </Centered>
        );
    }

    /* =========================
       FORM
    ========================== */

    return (
        <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
            <section className="max-w-md w-full bg-slate-900 p-6 rounded-3xl ring-1 ring-white/10 space-y-5">
                <header className="text-center space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-400 to-emerald-500 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-slate-950" />
                    </div>

                    <h1 className="text-2xl font-semibold">Join {invite?.familyName}</h1>
                    <p className="text-sm text-slate-300">
                        You’ve been invited to compete on FamiliGo.
                    </p>
                </header>

                <div className="space-y-3">
                    <Input icon={<User />} placeholder="Your name" value={name} onChange={setName} />
                    <Input icon={<Mail />} placeholder="Your email" value={email} onChange={setEmail} />
                    <Input
                        icon={<Lock />}
                        placeholder="Create a password"
                        type="password"
                        value={password}
                        onChange={setPassword}
                    />
                    <Input
                        icon={<Calendar />}
                        type="date"
                        value={birthDate}
                        onChange={setBirthDate}
                    />
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full rounded-full bg-gradient-to-r from-indigo-400 via-indigo-500 to-emerald-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 disabled:opacity-50"
                >
                    {submitting ? "Creating Account..." : "Join Family"}
                </button>

                <p className="text-[10px] text-slate-400 text-center">
                    Accounts are private and limited to your family only.
                </p>
            </section>
        </main>
    );
}

/* =========================
   Helpers
========================= */

function Input({
    icon,
    placeholder,
    value,
    onChange,
    type = "text",
}: any) {
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-800 p-3">
            <div className="text-slate-400">{icon}</div>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-slate-400 outline-none"
            />
        </div>
    );
}

function Centered({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
            {children}
        </div>
    );
}

function Spinner() {
    return (
        <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
    );
}

function ErrorCard({ message }: { message: string }) {
    return (
        <div className="max-w-md w-full bg-slate-900 p-6 rounded-3xl text-center ring-1 ring-red-500/30">
            <h2 className="text-lg font-semibold mb-2">Invite Error</h2>
            <p className="text-sm text-slate-300 mb-4">{message}</p>
            <button
                onClick={() => (window.location.href = "/")}
                className="text-xs text-indigo-400 hover:underline"
            >
                Back to Home
            </button>
        </div>
    );
}

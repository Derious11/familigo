import { useEffect, useMemo, useState } from "react";
import {
    ShieldCheck,
    Mail,
    User,
    Users,
    Send,
    CheckCircle2,
    Lock,
    AlertTriangle,
} from "lucide-react";
import { signUpWithEmail, signInWithGoogle } from "../services/authService";

type FieldErrors = Partial<Record<
    "parentName" | "parentEmail" | "parentPassword" | "kidCount",
    string
>>;

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function EarlyAccess() {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    // Parent fields
    const [parentName, setParentName] = useState("");
    const [parentEmail, setParentEmail] = useState("");
    const [parentPassword, setParentPassword] = useState("");
    const [kidCount, setKidCount] = useState<number | "">("");
    const [kidAges, setKidAges] = useState("");

    // UX state
    const [errors, setErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);

    const normalizedKidCount = useMemo(() => {
        const n = Number(kidCount);
        return Number.isFinite(n) ? n : 0;
    }, [kidCount]);

    const validate = () => {
        const next: FieldErrors = {};
        const name = parentName.trim();
        const email = parentEmail.trim();
        const password = parentPassword;

        if (!name || name.length < 2) next.parentName = "Please enter your name.";
        if (!email || !isValidEmail(email)) next.parentEmail = "Enter a valid email address.";
        if (!password || password.length < 8)
            next.parentPassword = "Password must be at least 8 characters.";
        if (!normalizedKidCount || normalizedKidCount < 1)
            next.kidCount = "Enter at least 1 kid.";

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleGoogleSignIn = async () => {
        setFormError(null);
        setErrors({});

        setLoading(true);
        try {
            const { error } = await signInWithGoogle("adult", {
                kidCount: normalizedKidCount,
                kidAges: kidAges.trim(),
            });

            if (error) {
                setFormError(typeof error === "string" ? error : "Google sign-in failed. Please try again.");
                return;
            }

            // Auth listener + status gating handles routing.
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            setFormError("Google sign-in failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAccount = async () => {
        setFormError(null);

        if (!validate()) return;

        setLoading(true);
        try {
            const { error } = await signUpWithEmail(
                parentName.trim(),
                parentEmail.trim(),
                parentPassword,
                "adult",
                undefined,
                {
                    kidCount: normalizedKidCount,
                    kidAges: kidAges.trim(),
                }
            );

            if (error) {
                setFormError(error);
                return;
            }

            setSubmitted(true);
        } catch (err) {
            console.error("Early access submission failed:", err);
            setFormError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    /* =========================
       Pending / Success Screen
    ========================== */
    if (submitted) {
        return (
            <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
                <section className="max-w-md w-full rounded-3xl bg-slate-900 p-6 ring-1 ring-white/5 text-center space-y-5">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                    <h1 className="text-xl font-semibold">Request received</h1>
                    <p className="text-sm text-slate-300">
                        Your parent account has been created and is pending approval.
                    </p>

                    <div className="rounded-2xl bg-slate-800 p-4 text-left space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                            What happens next
                        </p>
                        <ul className="text-xs text-slate-300 space-y-1">
                            <li>• We review beta requests in waves.</li>
                            <li>• You’ll receive an email once you’re approved.</li>
                            <li>• After approval, you can add your kids and start challenges.</li>
                        </ul>
                    </div>

                    <p className="text-[11px] text-slate-400">
                        If you used Google, you’ll sign in the same way later. If you created a password, keep it safe.
                    </p>

                    <button
                        onClick={() => (window.location.href = "/")}
                        className="mt-2 rounded-full bg-gradient-to-r from-emerald-400 to-indigo-500 px-6 py-2 text-xs font-semibold uppercase tracking-wider text-slate-950"
                    >
                        Back to Home
                    </button>
                </section>
            </main>
        );
    }

    /* =========================
       Main Form (Parent Only)
    ========================== */
    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <section className="mx-auto max-w-lg px-4 py-16">
                <header className="mb-8 text-center space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-indigo-500 flex items-center justify-center shadow-lg">
                        <ShieldCheck className="h-6 w-6 text-slate-950" />
                    </div>

                    <h1 className="text-2xl font-semibold">Join the FamiliGo beta</h1>

                    <p className="text-sm text-slate-300">
                        Parents create the family account. Once approved, you’ll be able to add your kids and start challenges.
                    </p>

                    <p className="text-xs text-slate-400">
                        No public feeds. No strangers. Family-only competition.
                    </p>
                </header>

                <div className="rounded-3xl bg-slate-900 p-6 ring-1 ring-white/5 space-y-5">
                    {/* Primary OAuth CTA */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        type="button"
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-white p-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                        <GoogleIcon />
                        Continue with Google (Request Access)
                    </button>

                    <p className="text-center text-xs text-slate-400">
                        We’ll confirm access after a quick review.
                    </p>

                    <Divider label="Or create an account" />

                    {formError && (
                        <div className="flex items-start gap-2 rounded-2xl bg-red-500/10 ring-1 ring-red-500/20 p-3">
                            <AlertTriangle className="h-4 w-4 text-red-300 mt-0.5" />
                            <p className="text-xs text-red-200">{formError}</p>
                        </div>
                    )}

                    <Input
                        icon={<User />}
                        placeholder="Your full name"
                        value={parentName}
                        onChange={setParentName}
                        error={errors.parentName}
                    />
                    <Input
                        icon={<Mail />}
                        placeholder="Your email"
                        value={parentEmail}
                        onChange={setParentEmail}
                        error={errors.parentEmail}
                        inputMode="email"
                    />
                    <Input
                        icon={<Lock />}
                        placeholder="Create a password (8+ characters)"
                        value={parentPassword}
                        onChange={setParentPassword}
                        error={errors.parentPassword}
                        type="password"
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                            icon={<Users />}
                            placeholder="Number of kids"
                            value={kidCount}
                            onChange={(v) => setKidCount(v === "" ? "" : Number(v))}
                            error={errors.kidCount}
                            type="number"
                        />
                        <Input
                            icon={<Users />}
                            placeholder="Kids’ ages (optional)"
                            value={kidAges}
                            onChange={setKidAges}
                            hint="Example: 9, 12, 15"
                        />
                    </div>

                    <button
                        onClick={handleCreateAccount}
                        disabled={loading}
                        className="mt-2 w-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-indigo-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg transition hover:brightness-110 disabled:opacity-50"
                    >
                        {loading ? (
                            "Processing..."
                        ) : (
                            <>
                                <Send className="inline-block h-4 w-4 mr-2" />
                                Create Parent Account & Request Access
                            </>
                        )}
                    </button>

                    <p className="text-[11px] text-slate-500 text-center">
                        By creating an account, you’re requesting beta access. You’ll receive an email when approved.
                    </p>
                </div>
            </section>
        </main>
    );
}

/* =========================
   Reusable Components
========================== */

function Divider({ label }: { label: string }) {
    return (
        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500">{label}</span>
            </div>
        </div>
    );
}

function GoogleIcon() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

function Input({
    icon,
    placeholder,
    value,
    onChange,
    type = "text",
    error,
    hint,
    inputMode,
}: {
    icon: React.ReactNode;
    placeholder: string;
    value: string | number | "";
    onChange: (v: any) => void;
    type?: string;
    error?: string;
    hint?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
    return (
        <div className="space-y-1">
            <div
                className={[
                    "flex items-center gap-3 rounded-2xl bg-slate-800 p-3 ring-1",
                    error ? "ring-red-500/30" : "ring-white/5",
                ].join(" ")}
            >
                <div className={error ? "text-red-200" : "text-slate-400"}>{icon}</div>
                <input
                    type={type}
                    inputMode={inputMode}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-transparent text-sm text-white placeholder-slate-400 outline-none"
                />
            </div>

            {error ? (
                <p className="text-[11px] text-red-200">{error}</p>
            ) : hint ? (
                <p className="text-[11px] text-slate-500">{hint}</p>
            ) : null}
        </div>
    );
}

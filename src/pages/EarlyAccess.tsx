import { useEffect, useState } from "react";
import {
    ShieldCheck,
    Trophy,
    Mail,
    User,
    Users,
    Send,
    CheckCircle2,
} from "lucide-react";
import { submitEarlyAccessRequest } from "../services/earlyAccessService";

type Role = "parent" | "teen";

export default function EarlyAccess() {
    const [role, setRole] = useState<Role>("parent");
    const [submitted, setSubmitted] = useState(false);

    // ✅ Parent Fields
    const [parentName, setParentName] = useState("");
    const [parentEmail, setParentEmail] = useState("");
    const [kidCount, setKidCount] = useState<number | "">("");
    const [kidAges, setKidAges] = useState("");

    // ✅ Teen Fields
    const [teenNickname, setTeenNickname] = useState("");
    const [teenAge, setTeenAge] = useState<number | "">("");
    const [parentEmailForTeen, setParentEmailForTeen] = useState("");
    const [challengeTarget, setChallengeTarget] = useState("");

    // ✅ Resolve role from URL or localStorage
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const roleParam = params.get("role") as Role | null;
        const storedRole = localStorage.getItem("familiGoRole") as Role | null;

        if (roleParam === "parent" || roleParam === "teen") {
            setRole(roleParam);
        } else if (storedRole === "parent" || storedRole === "teen") {
            setRole(storedRole);
        }
    }, []);

    // ✅ Correctly Scoped Submit Handler
    const handleSubmit = async () => {
        const payload =
            role === "parent"
                ? {
                    role: "parent" as const,
                    name: parentName,
                    email: parentEmail,
                    kidCount,
                    kidAges,
                    status: "pending" as const,
                    createdAt: new Date().toISOString(),
                }
                : {
                    role: "teen" as const,
                    nickname: teenNickname,
                    age: teenAge,
                    parentEmail: parentEmailForTeen,
                    challengeTarget,
                    status: "pending" as const,
                    createdAt: new Date().toISOString(),
                };

        try {
            console.log("Early Access Submission:", payload);

            // ✅ REAL FIRESTORE WRITE
            await submitEarlyAccessRequest(payload);

            setSubmitted(true);
        } catch (error) {
            console.error("Early access submission failed:", error);
            alert("Something went wrong. Please try again.");
        }
    };

    /* =========================
       ✅ SUCCESS / PENDING STATE
    ========================== */
    if (submitted) {
        return (
            <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
                <section className="max-w-md w-full rounded-3xl bg-slate-900 p-6 ring-1 ring-white/5 text-center space-y-5">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                    <h1 className="text-xl font-semibold">Request Received</h1>
                    <p className="text-sm text-slate-300">
                        Your early access request has been submitted and is pending approval.
                    </p>
                    <p className="text-xs text-slate-400">
                        Once approved, you’ll receive a private access email with setup
                        instructions.
                    </p>
                    <button
                        onClick={() => (window.location.href = "/")}
                        className="mt-4 rounded-full bg-gradient-to-r from-emerald-400 to-indigo-500 px-6 py-2 text-xs font-semibold uppercase tracking-wider text-slate-950"
                    >
                        Back to Home
                    </button>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <section className="mx-auto max-w-lg px-4 py-16">
                <header className="mb-8 text-center space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-indigo-500 flex items-center justify-center shadow-lg">
                        {role === "parent" ? (
                            <ShieldCheck className="h-6 w-6 text-slate-950" />
                        ) : (
                            <Trophy className="h-6 w-6 text-slate-950" />
                        )}
                    </div>

                    <h1 className="text-2xl font-semibold">
                        {role === "parent"
                            ? "Request Family Early Access"
                            : "Claim Your Early Access"}
                    </h1>

                    <p className="text-sm text-slate-300">
                        {role === "parent"
                            ? "Join the FamiliGo Family Beta and start building healthy habits together."
                            : "Get approved to challenge your parents and compete for the podium."}
                    </p>
                </header>

                <div className="rounded-3xl bg-slate-900 p-6 ring-1 ring-white/5 space-y-5">
                    {/* ✅ PARENT FORM */}
                    {role === "parent" && (
                        <>
                            <Input icon={<User />} placeholder="Your full name" value={parentName} onChange={setParentName} />
                            <Input icon={<Mail />} placeholder="Your email" value={parentEmail} onChange={setParentEmail} />
                            <Input icon={<Users />} placeholder="Number of kids" value={kidCount} onChange={(v) => setKidCount(Number(v))} type="number" />
                            <Input icon={<Users />} placeholder="Ages of kids (optional, e.g. 9, 12, 15)" value={kidAges} onChange={setKidAges} />
                        </>
                    )}

                    {/* ✅ TEEN FORM */}
                    {role === "teen" && (
                        <>
                            <Input icon={<User />} placeholder="Your nickname" value={teenNickname} onChange={setTeenNickname} />
                            <Input icon={<User />} placeholder="Your age" value={teenAge} onChange={(v) => setTeenAge(Number(v))} type="number" />
                            <Input icon={<Mail />} placeholder="Your parent’s email" value={parentEmailForTeen} onChange={setParentEmailForTeen} />
                            <Input icon={<Trophy />} placeholder="Who do you want to challenge first?" value={challengeTarget} onChange={setChallengeTarget} />
                        </>
                    )}

                    <button
                        onClick={handleSubmit}
                        className="mt-4 w-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-indigo-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg transition hover:brightness-110"
                    >
                        <Send className="inline-block h-4 w-4 mr-2" />
                        Submit Request
                    </button>
                </div>
            </section>
        </main>
    );
}

/* =========================
   ✅ REUSABLE INPUT COMPONENT
========================== */
function Input({
    icon,
    placeholder,
    value,
    onChange,
    type = "text",
}: {
    icon: React.ReactNode;
    placeholder: string;
    value: string | number | "";
    onChange: (v: any) => void;
    type?: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-800 p-3">
            <div className="text-slate-400">{icon}</div>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-slate-400 outline-none"
            />
        </div>
    );
}

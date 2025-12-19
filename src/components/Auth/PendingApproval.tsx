import React from 'react';
import { Clock, ShieldCheck, Mail, CheckCircle2 } from 'lucide-react';
import { signOutUser } from '../../services/authService';

const PendingApproval = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
            <div className="max-w-md w-full bg-slate-900 rounded-3xl p-8 text-center ring-1 ring-white/10 shadow-2xl space-y-6">

                {/* Icon */}
                <div className="mx-auto bg-amber-500/10 w-16 h-16 rounded-2xl flex items-center justify-center">
                    <Clock className="w-8 h-8 text-amber-400" />
                </div>

                {/* Header */}
                <header className="space-y-2">
                    <h1 className="text-2xl font-semibold">
                        Account created
                    </h1>
                    <p className="text-sm text-slate-300">
                        Your FamiliGo account is pending approval.
                    </p>
                </header>

                {/* Explanation */}
                <div className="bg-slate-800/50 rounded-2xl p-4 text-left space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                        What happens next
                    </p>

                    <ul className="space-y-2 text-sm text-slate-300">
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                            We review beta requests in small groups.
                        </li>
                        <li className="flex items-start gap-2">
                            <Mail className="w-4 h-4 text-indigo-400 mt-0.5" />
                            You’ll receive an email once your account is approved.
                        </li>
                        <li className="flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 text-sky-400 mt-0.5" />
                            After approval, you can create your family and invite your kids.
                        </li>
                    </ul>
                </div>

                {/* Reassurance */}
                <p className="text-xs text-slate-400">
                    FamiliGo is designed to be private, family-only, and parent-controlled.
                </p>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                    <button
                        onClick={() => (window.location.href = '/')}
                        className="w-full rounded-full bg-gradient-to-r from-emerald-400 to-indigo-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-950 shadow-lg transition hover:brightness-110"
                    >
                        Back to Home
                    </button>

                    <button
                        onClick={signOutUser}
                        className="text-xs text-slate-400 hover:text-white transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PendingApproval;

import { useMemo,useState } from "react";
import { signInWithGoogle,signUpWithEmail } from "../services/authService";
import { getAuth } from 'firebase/auth';
import { redeemAccessInvite } from '../services/adminService';
import { usePostHog } from '../lib/analytics';
type FieldErrors = Partial<Record<
    "parentName" | "parentEmail" | "parentPassword" | "kidCount",
    string
>>;

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function useEarlyAccessForm() {
    const posthog = usePostHog();
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [accessCode, setAccessCode] = useState(() => new URLSearchParams(window.location.search).get('accessCode') || '');

    const finishSignup = async () => {
        if (accessCode.trim()) {
            await getAuth().currentUser?.getIdToken(true);
            await redeemAccessInvite(accessCode);
            window.location.assign('/app/onboarding');
        } else {
            setSubmitted(true);
        }
    };

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
        if (kidCount !== '' && (!Number.isInteger(normalizedKidCount) || normalizedKidCount < 1))
            next.kidCount = "Enter a whole number of at least 1, or leave this optional field blank.";

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleGoogleSignIn = async () => {
        setFormError(null);
        setErrors({});

        setLoading(true);
        try {
            const { error } = await signInWithGoogle("adult", {
                ...(kidCount !== '' ? { kidCount: normalizedKidCount } : {}),
                ...(kidAges.trim() ? { kidAges: kidAges.trim() } : {}),
            });

            if (error) {
                setFormError(typeof error === "string" ? error : "Google sign-in failed. Please try again.");
                return;
            }

            // Auth listener + status gating handles routing.
            if (!getAuth().currentUser) return;
            posthog?.capture('beta_registration_submitted', { method: 'google', has_invite: !!accessCode.trim() });
            await finishSignup();
        } catch (err) {
            console.error(err);
            setFormError(accessCode.trim() ? 'Your invitation could not be applied. Sign in with the invited email and redeem your code on the approval screen.' : 'Google sign-in failed. Please try again.');
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
                    ...(kidCount !== '' ? { kidCount: normalizedKidCount } : {}),
                    ...(kidAges.trim() ? { kidAges: kidAges.trim() } : {}),
                }
            );

            if (error) {
                setFormError(error);
                return;
            }

            posthog?.capture('beta_registration_submitted', { method: 'email', has_invite: !!accessCode.trim() });
            await finishSignup();
        } catch (err) {
            console.error("Early access submission failed:", err);
            setFormError(accessCode.trim() ? 'Your account may have been created, but the invitation could not be applied. Sign in and redeem your code on the approval screen.' : 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return {
        submitted, loading, accessCode, setAccessCode, parentName, setParentName, parentEmail, setParentEmail,
        parentPassword, setParentPassword, kidCount, setKidCount, kidAges, setKidAges,
        errors, formError, handleGoogleSignIn, handleCreateAccount,
    };
}

export { GoogleIcon } from '../components/GoogleIcon';

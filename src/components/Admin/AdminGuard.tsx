import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../App";
import { getAuth } from "firebase/auth";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const ctx = useContext(AppContext);
    const [checked, setChecked] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [error, setError] = useState(false);

    // Wait for auth to resolve
    useEffect(() => {
        let active = true;
        setChecked(false);
        setError(false);
        async function checkAdmin() {
            if (!ctx || ctx.loading) return;

            if (!ctx.currentUser) {
                window.location.href = "/login";
                return;
            }

            const auth = getAuth();
            const tokenResult = await auth.currentUser?.getIdTokenResult(true);
            if (!active) return;

            const adminClaim = tokenResult?.claims?.admin === true;
            setIsAdmin(adminClaim);
            setChecked(true);

            if (!adminClaim) {
                window.location.href = "/app";
            }
        }

        checkAdmin().catch(() => { if (active) setError(true); });
        return () => { active = false; };
    }, [ctx?.currentUser?.id]);

    if (error) return <p role="alert">Unable to verify administrator access. Please reload to try again.</p>;
    if (!ctx || ctx.loading || !checked) return null;

    return isAdmin ? <>{children}</> : null;
}

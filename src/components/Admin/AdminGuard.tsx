import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../App";
import { getAuth } from "firebase/auth";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const ctx = useContext(AppContext);
    const [checked, setChecked] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Wait for auth to resolve
    useEffect(() => {
        async function checkAdmin() {
            if (!ctx || ctx.loading) return;

            if (!ctx.currentUser) {
                window.location.href = "/login";
                return;
            }

            const auth = getAuth();
            const tokenResult = await auth.currentUser?.getIdTokenResult(true);

            const adminClaim = tokenResult?.claims?.admin === true;
            setIsAdmin(adminClaim);
            setChecked(true);

            if (!adminClaim) {
                window.location.href = "/app";
            }
        }

        checkAdmin();
    }, [ctx]);

    if (!ctx || ctx.loading || !checked) return null;

    return isAdmin ? <>{children}</> : null;
}

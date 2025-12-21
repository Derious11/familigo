import { useContext } from "react";
import { AppContext } from "../../App";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const ctx = useContext(AppContext);

    // Wait for auth to resolve
    if (!ctx || ctx.loading) return null;

    // Not logged in → send to login
    if (!ctx.currentUser) {
        window.location.href = "/login";
        return null;
    }

    // Logged in but not admin → send to app home
    if (!ctx.currentUser.isAdmin) {
        window.location.href = "/app";
        return null;
    }

    return <>{children}</>;
}

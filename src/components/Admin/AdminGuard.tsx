import { useContext } from "react";
import { AppContext } from "../../App";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const ctx = useContext(AppContext);

    if (!ctx?.currentUser) return <p>You must be logged in.</p>;

    if (!ctx.currentUser.isAdmin) {
        return <p className="text-center mt-10 text-red-500">
            Access Denied — Admins Only
        </p>;
    }

    return <>{children}</>;
}

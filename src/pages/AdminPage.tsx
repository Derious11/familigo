import { useEffect, useState, useContext } from "react";
import { AppContext } from "../App";
import AdminGuard from "../components/Admin/AdminGuard";
import { getPendingUsers, approveUser } from "../services/userService";
import { User } from "../types";
import { CheckCircle2, User as UserIcon } from "lucide-react";

export default function AdminPage() {
    const { currentUser } = useContext(AppContext) as any; // Cast to any or proper type if available
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const users = await getPendingUsers();
            setPendingUsers(users);
        } catch (error) {
            console.error("Failed to fetch pending users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async (userId: string) => {
        if (!currentUser) return;
        try {
            await approveUser(userId, currentUser.id);
            // Refresh list
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error("Approval failed:", error);
            alert("Failed to approve user");
        }
    };

    return (
        <AdminGuard>
            <main className="min-h-screen bg-slate-950 text-white p-8">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                        <p className="text-slate-400">Manage approvals and system health</p>
                    </div>
                    <button
                        onClick={fetchPending}
                        className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg transition-colors"
                    >
                        Refresh
                    </button>
                </header>

                <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-800">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <UserIcon className="w-5 h-5 text-indigo-400" />
                            Early Access Queue
                            <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-1 rounded-full">{pendingUsers.length}</span>
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading queue...</div>
                    ) : pendingUsers.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No pending requests.</div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {pendingUsers.map(user => (
                                <div key={user.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-800/50 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <p className="font-medium text-white">{user.name}</p>
                                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">{user.email}</span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                                            <span>Start: {user.earlyAccessData?.parentEmail || 'N/A'}</span>
                                            {user.earlyAccessData && (
                                                <>
                                                    <span>Kids: {user.earlyAccessData.kidCount}</span>
                                                    <span>Ages: {user.earlyAccessData.kidAges}</span>
                                                </>
                                            )}
                                            {/* Show date if available in metadata or earlyAccessData.createdAt. 
                                                Since we don't have createdAt on User type explicitly except in earlyAccessData? 
                                                Actually createdAt is not in the User type I defined, but might be in earlyAccessData if we passed it.
                                                We didn't pass createdAt in the new flow, we just passed extra data. 
                                                It's okay. */}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleApprove(user.id)}
                                        className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Approve Access
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </AdminGuard>
    );
}

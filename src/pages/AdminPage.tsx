import { useEffect, useState, useContext } from "react";
import { AppContext } from "../App";
import AdminGuard from "../components/Admin/AdminGuard";
import { getPendingUsers, approveUser } from "../services/userService";
import { getAllFeedback, deleteFeedback } from "../services/feedbackService";
import { User, Feedback } from "../types";
import { CheckCircle2, User as UserIcon, MessageSquare, Star, ExternalLink, Trash2 } from "lucide-react";

export default function AdminPage() {
    const { currentUser } = useContext(AppContext) as any;
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [users, feedback] = await Promise.all([
                getPendingUsers(),
                getAllFeedback()
            ]);
            setPendingUsers(users);
            setFeedbackList(feedback);
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApprove = async (userId: string) => {
        if (!currentUser) return;
        try {
            await approveUser(userId, currentUser.id);
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error("Approval failed:", error);
            alert("Failed to approve user");
        }
    };

    const handleDeleteFeedback = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this feedback?")) return;
        try {
            await deleteFeedback(id);
            setFeedbackList(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            console.error("Failed to delete feedback:", error);
            alert("Failed to delete feedback");
        }
    };

    return (
        <AdminGuard>
            <main className="min-h-screen bg-slate-950 text-white p-8">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                        <p className="text-slate-400">Manage approvals and view feedback</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg transition-colors"
                    >
                        Refresh
                    </button>
                </header>

                <div className="space-y-8">
                    {/* Early Access Queue */}
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

                    {/* Feedback Section */}
                    <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-pink-400" />
                                User Feedback
                                <span className="bg-pink-500/20 text-pink-300 text-xs px-2 py-1 rounded-full">{feedbackList.length}</span>
                            </h2>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Loading feedback...</div>
                        ) : feedbackList.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No feedback yet.</div>
                        ) : (
                            <div className="divide-y divide-slate-800">
                                {feedbackList.map(item => (
                                    <div key={item.id} className="p-4 hover:bg-slate-800/50 transition-colors flex flex-col gap-2 group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-white text-sm">
                                                        {item.userName || "Unknown User"}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {item.userEmail || item.userId}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-500 border border-slate-700 rounded px-1.5 py-0.5 ml-2">{item.role}</span>
                                                <span className="text-xs text-slate-600">{item.timestamp?.toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {item.rating && (
                                                    <div className="flex items-center gap-1 text-yellow-500">
                                                        <span className="text-sm font-bold">{item.rating}</span>
                                                        <Star className="w-3 h-3 fill-current" />
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteFeedback(item.id)}
                                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Delete Feedback"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="text-sm text-slate-300">
                                            <span className="text-slate-500 text-xs uppercase tracking-wider font-bold mr-2">Issue:</span>
                                            {item.issue}
                                        </div>

                                        {item.whatWorked && (
                                            <div className="text-sm text-emerald-400/80">
                                                <span className="text-slate-500 text-xs uppercase tracking-wider font-bold mr-2">Good:</span>
                                                {item.whatWorked}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                            <span>Context: {item.context}</span>
                                            {item.screenshotUrl && (
                                                <a
                                                    href={item.screenshotUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    View Screenshot
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </AdminGuard>
    );
}

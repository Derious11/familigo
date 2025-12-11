import AdminGuard from "../components/Admin/AdminGuard";

export default function AdminPage() {
    return (
        <AdminGuard>
            <main className="min-h-screen bg-slate-950 text-white p-8">
                <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>

                <p className="text-slate-300 mb-6">
                    Manage Early Access approvals, review activity, and oversee FamiliGo operations.
                </p>

                <section className="bg-slate-900 p-6 rounded-2xl ring-1 ring-white/10">
                    <h2 className="text-xl font-semibold mb-2">Early Access Queue</h2>
                    <p className="text-slate-400">Pending requests will load here.</p>
                </section>
            </main>
        </AdminGuard>
    );
}

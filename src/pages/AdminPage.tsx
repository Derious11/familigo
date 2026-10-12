import AdminGuard from '../components/Admin/AdminGuard';
import AdminDashboard from '../components/Admin/AdminDashboard';

export default function AdminPage() {
    return <AdminGuard><AdminDashboard /></AdminGuard>;
}

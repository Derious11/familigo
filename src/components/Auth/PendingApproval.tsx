import { Clock } from 'lucide-react';
import { useContext } from 'react';
import { AppContext } from '../../App';
import { signOutUser } from '../../services/authService';
import AccountStateFrame from '../AccountStateFrame';
const PendingApproval = ({ readOnly = false }: {
    readOnly?: boolean;
}) => {
    const { currentUser: user } = useContext(AppContext);
    return <AccountStateFrame><div className="app-account-status-icon"><Clock size={30} aria-hidden="true"/></div><p className="app-eyebrow">One step closer to the fun</p><h1>Account created.</h1><p>Your FamiliGo account is awaiting {user?.role === 'teen' ? 'parent' : 'beta'} approval.</p><div className="app-account-next"><h2>What happens next</h2>{user?.role === 'teen' ? <p>Ask your parent to open FamiliGo and approve your account. Access becomes available after approval.</p> : <p>We review beta requests in groups. You’ll receive an email once approved, then you can set up your family and choose a challenge.</p>}</div><a className="app-account-primary" href="/">Back to FamiliGo</a><button type="button" onClick={signOutUser} disabled={readOnly} className="app-account-secondary">Sign out</button></AccountStateFrame>;
};
export default PendingApproval;

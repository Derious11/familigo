import { Clock } from 'lucide-react';
import { useContext, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { redeemAccessInvite } from '../../services/adminService';
import { AppContext } from '../../App';
import { signOutUser } from '../../services/authService';
import AccountStateFrame from '../AccountStateFrame';
const PendingApproval = ({ readOnly = false }: {
    readOnly?: boolean;
}) => {
    const { currentUser: user } = useContext(AppContext);
    const [code, setCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [error, setError] = useState('');
    const redeem = async () => {
        setRedeeming(true);
        setError('');
        try {
            await getAuth().currentUser?.reload();
            await getAuth().currentUser?.getIdToken(true);
            await redeemAccessInvite(code);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Could not redeem your invitation. Please try again.');
        } finally {
            setRedeeming(false);
        }
    };
    return <AccountStateFrame>
        <div className="app-account-status-icon"><Clock size={30} aria-hidden="true" /></div>
        <p className="app-eyebrow">One step closer to the fun</p>
        <h1>Account created.</h1>
        <p>Your FamiliGo account is awaiting {user?.role === 'teen' ? 'parent' : 'beta'} approval.</p>
        <div className="app-account-next">
            <h2>What happens next</h2>
            {user?.role === 'teen'
                ? <p>Ask your parent to open FamiliGo and approve your account. Access becomes available after approval.</p>
                : <p>We review beta requests in groups. You’ll receive an email once approved, then you can set up your family and choose a challenge.</p>}
        </div>
        {user?.role === 'adult' && <form onSubmit={event => { event.preventDefault(); void redeem(); }} className="my-5 text-left" aria-busy={redeeming}>
            <label htmlFor="access-invite-code" className="mb-2 block text-sm font-medium">Have an app admin invite code?</label>
            <p id="access-invite-hint" className="mb-3 text-sm text-slate-400">Enter the code sent to your account email to activate your pre-approved access and create your family circle.</p>
            <input id="access-invite-code" aria-describedby="access-invite-hint" required maxLength={24} autoComplete="off"
                value={code} onChange={event => setCode(event.target.value)} disabled={readOnly || redeeming}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white" />
            {error && <p role="alert" className="mt-2 text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={readOnly || redeeming} className="app-account-primary mt-3">{redeeming ? 'Redeeming…' : 'Redeem invite code'}</button>
        </form>}
        <a className="app-account-primary" href="/">Back to FamiliGo</a>
        <button type="button" onClick={signOutUser} disabled={readOnly || redeeming} className="app-account-secondary">Sign out</button>
    </AccountStateFrame>;
};
export default PendingApproval;

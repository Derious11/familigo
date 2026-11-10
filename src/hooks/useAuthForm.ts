import {useEffect, useRef, useState, type FormEvent} from 'react';
type Actions = typeof import('../services/loginAuth');

export function useAuthForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [ready, setReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const actions = useRef<Actions | null>(null);
    const submitting = useRef(false);
    useEffect(() => {
        let active = true;
        let stop: undefined | (() => void);
        const url = new URL(location.href);
        const invite = url.searchParams.get('inviteCode');
        if (invite) {
            sessionStorage.setItem('pendingInviteCode', invite.toUpperCase());
            url.searchParams.delete('inviteCode');
            history.replaceState(history.state, '', url);
        }
        Promise.all([import('../services/loginAuth'), import('../firebaseAuth'), import('firebase/auth')])
          .then(([api, {auth}, {onAuthStateChanged}]) => {
            if (!active) return;
            actions.current = api;
            stop = onAuthStateChanged(auth, user => {
                // A new Google account must finish creating its profile before navigation.
                if (user && !submitting.current && location.pathname.toLowerCase() === '/login') {
                    location.replace('/app');
                } else setReady(true);
            });
          }).catch(() => { if (active) setError('Unable to load sign-in. Reconnect and reload to try again.'); });
        return () => { active = false; stop?.(); };
    }, []);
    async function submit(google: boolean) {
        if (!ready || submitting.current || !actions.current) return false;
        submitting.current = true;
        setError(''); setIsLoading(true);
        try {
            // Call the popup synchronously within the click's user activation.
            const result = await (google ? actions.current.signInWithGoogle() : actions.current.signInWithEmail(email, password));
            if (result.error) setError(result.error);
            return !result.error && !('cancelled' in result && result.cancelled);
        } catch {
            setError('Unable to sign in. Please try again.');
            return false;
        } finally {
            submitting.current = false; setIsLoading(false);
        }
    }
    return {email,setEmail,password,setPassword,error,isLoading,ready,
        handleSubmit: (event: FormEvent) => { event.preventDefault(); return submit(false); },
        handleGoogleSignIn: () => submit(true)};
}

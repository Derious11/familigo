import {useEffect, useState} from 'react';
import {collection, query, where, orderBy, limit, onSnapshot, Timestamp} from 'firebase/firestore';
import {db} from '../firebaseConfig';
import {Challenge} from '../types';
import {useLiveCollection} from './useLiveCollection';

// One bounded watcher finds the next expiration, including a newly posted goal.
// Refresh only at an actual boundary or when returning to the tab.
export function useChallengePages(familyId: string | undefined, past: boolean, enabled = true) {
    const [cutoff, setCutoff] = useState(Date.now);
    const [clockError, setClockError] = useState<Error | null>(null);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!familyId || !enabled) return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const refresh = () => { if (document.visibilityState === 'visible') setCutoff(Date.now()); };
        document.addEventListener('visibilitychange', refresh);
        const unsubscribe = onSnapshot(query(collection(db, 'challenges'),
            where('familyCircleId', '==', familyId), where('expiresAt', '>', Timestamp.fromMillis(cutoff)),
            orderBy('expiresAt', 'asc'), limit(1)), snapshot => {
            setClockError(null);
            clearTimeout(timer);
            const at = snapshot.docs[0]?.get('expiresAt')?.toMillis();
            if (at) timer = setTimeout(() => setCutoff(Date.now()), Math.min(2147483647, Math.max(1, at - Date.now() + 20)));
        }, error => setClockError(error));
        return () => { clearTimeout(timer); unsubscribe(); document.removeEventListener('visibilitychange', refresh); };
    }, [familyId, cutoff, enabled, attempt]);
    const result = useLiveCollection<Challenge>('challenges', [['familyCircleId', familyId]], !!familyId && enabled,
        {field:'expiresAt', operator:past ? '<=' : '>', milliseconds:cutoff, direction:past ? 'desc' : 'asc'});
    return {...result, error:result.error || clockError, retry:() => { result.retry(); setAttempt(value => value + 1); }};
}

import {useEffect} from 'react';
import {achievementCall} from '../services/achievementService';

type Action = 'recordChallenge' | 'recordChallengeReply';
const lastAttempt = new Map<Action, number>();

// Only on explicit intent; never a keepalive timer or a prerequisite for saving.
export function usePrepareChallengeAction(action: Action) {
    useEffect(() => {
        const now = Date.now();
        if (!navigator.onLine || now - (lastAttempt.get(action) ?? 0) < 4 * 60_000) return;
        lastAttempt.set(action, now);
        void achievementCall(action, {prepareOnly:true}).catch(() => {
            // Compatibility with older deployments and intermittent connections:
            // the normal authorized mutation is always independently available.
        });
    }, [action]);
}

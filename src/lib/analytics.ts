import type {PostHog} from 'posthog-js';

let client: PostHog | undefined;
const pending: Array<(sdk: PostHog) => void> = [];
let unavailable = false;
function send(operation: (sdk: PostHog) => void) {
    if (client) operation(client);
    else if (!unavailable && pending.length < 100) pending.push(operation);
}
const analytics = {
    capture: (...args: Parameters<PostHog['capture']>) => send(s => s.capture(...args)),
    identify: (...args: Parameters<PostHog['identify']>) => send(s => s.identify(...args)),
    group: (...args: Parameters<PostHog['group']>) => send(s => s.group(...args)),
    reset: (...args: Parameters<PostHog['reset']>) => send(s => s.reset(...args)),
};
export const usePostHog = () => analytics;
let scheduled = false;
export function startAnalyticsAfterContent() {
    if (scheduled) return;
    scheduled = true;
    function load() {
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-CTHC8XG4T9';
        document.head.appendChild(script);
        const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
        if (!key) { unavailable = true; pending.length = 0; return; }
        void import('posthog-js').then(({default: sdk}) => {
            sdk.init(key, {api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST, defaults: '2025-11-30'});
            client = sdk;
            for (const event of pending.splice(0)) event(sdk);
        }).catch(() => { unavailable = true; pending.length = 0; });
    }
    const observer = new MutationObserver(check);
    function check() {
        if (!document.querySelector('#public-preview h1, #root h1, #root h2, #root button, #root form')) return;
        observer.disconnect();
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if ('requestIdleCallback' in window) window.requestIdleCallback(load, {timeout: 2000});
            else setTimeout(load, 0);
        }));
    }
    observer.observe(document.body, {childList:true, subtree:true});
    check();
}

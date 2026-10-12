// Keep old bookmarks useful while exposing only one design per destination.
export function getLegacyDestination(pathname) {
    const path = pathname.toLowerCase();
    const destinations = {
        '/landing-v2': '/',
        '/landingpagea': '/',
        '/landingpageb': '/',
        '/parents': '/',
        '/teens': '/',
        '/early-access-v2': '/early-access',
        '/login-v2': '/login',
        '/app-preview': '/app',
    };
    if (destinations[path]) return destinations[path];
    if (path.startsWith('/app-preview/')) return `/app${pathname.slice('/app-preview'.length)}`;
    return null;
}

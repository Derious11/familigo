import test from 'node:test';
import assert from 'node:assert/strict';
import { getLegacyDestination } from '../src/lib/legacyRoutes.mjs';

test('old marketing bookmarks lead to the single public homepage', () => {
    for (const path of ['/landing-v2', '/landingpagea', '/landingpageb', '/parents', '/teens']) {
        assert.equal(getLegacyDestination(path), '/');
    }
});
test('auth aliases preserve their distinct destinations', () => {
    assert.equal(getLegacyDestination('/early-access-v2'), '/early-access');
    assert.equal(getLegacyDestination('/LOGIN-V2'), '/login');
});
test('nested app bookmarks retain onboarding and admin subpaths', () => {
    assert.equal(getLegacyDestination('/app-preview'), '/app');
    assert.equal(getLegacyDestination('/app-preview/onboarding'), '/app/onboarding');
    assert.equal(getLegacyDestination('/app-preview/admin'), '/app/admin');
});
test('canonical and invitation routes do not redirect or loop', () => {
    for (const path of ['/', '/app', '/app/admin', '/login', '/early-access', '/claim-invite', '/invite-parent', '/privacy', '/application']) {
        assert.equal(getLegacyDestination(path), null);
    }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {lockScroll} from '../src/lib/scrollLock.mjs';

for (const order of [[0, 1], [1, 0]]) {
    test(`overlapping dialogs restore scrolling when closed in order ${order}`, () => {
        const body = {style: {overflow: ''}};
        const root = {style: {overflow: 'auto'}};
        const release = [lockScroll([body, root]), lockScroll([body, root])];
        release[order[0]]();
        assert.equal(body.style.overflow, 'hidden');
        assert.equal(root.style.overflow, 'hidden');
        release[order[1]]();
        assert.equal(body.style.overflow, '');
        assert.equal(root.style.overflow, 'auto');
        release[order[0]]();
        assert.equal(body.style.overflow, '');
    });
}
test('effect cleanup and remount preserve original scrolling', () => {
    const body = {style: {overflow: 'scroll'}};
    lockScroll([body, null, body])();
    const release = lockScroll([body]);
    assert.equal(body.style.overflow, 'hidden');
    release();
    assert.equal(body.style.overflow, 'scroll');
});

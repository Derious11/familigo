// Dialogs share ownership so closing one cannot restore another dialog's lock.
const locks = new WeakMap();
export function lockScroll(elements) {
    const targets = [...new Set(elements.filter(Boolean))];
    for (const element of targets) {
        let lock = locks.get(element);
        if (!lock) {
            lock = { count: 0, overflow: element.style.overflow };
            locks.set(element, lock);
            element.style.overflow = 'hidden';
        }
        lock.count++;
    }
    let released = false;
    return () => {
        if (released) return;
        released = true;
        for (const element of targets) {
            const lock = locks.get(element);
            if (--lock.count === 0) {
                element.style.overflow = lock.overflow;
                locks.delete(element);
            }
        }
    };
}

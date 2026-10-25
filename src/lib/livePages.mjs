// Each listener is capped at pageSize. When a live boundary moves, rebase the
// following pages before publishing, so inserts/deletes cannot leave gaps.
export function livePages({ listen, key, compare, pageSize, publish }) {
    let stopped = false;
    let wanted = 1;
    let pages = [];
    let items = [];
    let error = null;
    const emit = () => {
        if (stopped) return;
        error = pages.find(page => page.error)?.error || null;
        const ready = pages.length === wanted && pages.every(page => page.ready);
        if (ready) {
            const next = [...new Map(pages.flatMap(page => page.rows).map(row => [row.id, row])).values()];
            // Keep already-visible older rows when a burst pushes page boundaries.
            // Compare positions rather than looking for an ID: a deleted anchor
            // must not cause us to fetch the entire remaining history.
            if (items.length && next.length && pages.at(-1).rows.length === pageSize && compare(next.at(-1), items.at(-1)) < 0) {
                wanted++;
                attach(wanted - 1, next.at(-1));
                return;
            }
            items = next;
        }
        publish({ items, loading: !ready && !error, error, hasMore: ready && pages.at(-1).rows.length === pageSize });
    };
    const truncate = index => {
        for (const page of pages.splice(index)) { page.active = false; page.unsubscribe?.(); }
    };
    const attach = (index, cursor) => {
        const page = { active:true, ready:false, rows:[], boundary:null, unsubscribe:null, error:null };
        pages[index] = page;
        page.unsubscribe = listen(cursor, rows => {
            if (stopped || !page.active) return;
            page.error = null;
            const boundary = rows.length ? key(rows.at(-1)) : null;
            const changed = !page.ready || boundary !== page.boundary;
            page.rows = rows;
            page.ready = true;
            page.boundary = boundary;
            if (changed) {
                truncate(index + 1);
                if (rows.length < pageSize) wanted = index + 1;
                else if (index + 1 < wanted) attach(index + 1, rows.at(-1));
            }
            emit();
        }, failure => {
            if (stopped || !page.active) return;
            page.error = failure;
            emit();
        });
    };
    attach(0, null);
    return {
        loadMore() {
            if (stopped || error || pages.length !== wanted || pages.some(page => !page.ready) || pages.at(-1).rows.length < pageSize) return;
            wanted++;
            attach(wanted - 1, pages[wanted - 2].rows.at(-1));
            emit();
        },
        retry() { if (!stopped) { error = null; truncate(0); attach(0, null); emit(); } },
        stop() { stopped = true; truncate(0); },
    };
}

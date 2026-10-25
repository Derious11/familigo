import test from 'node:test';
import assert from 'node:assert/strict';
import { livePages } from '../src/lib/livePages.mjs';
function fixture() {
    let records = Array.from({length:95},(_,i)=>({id:String(100-i),rank:100-i}));
    const listeners = new Set();
    let state;
    const deliver = sub => sub.receive(records.filter(row => !sub.cursor || row.rank < sub.cursor.rank).slice(0,30));
    const pager = livePages({pageSize:30,key:r=>r.id,compare:(a,b)=>b.rank-a.rank, publish:s=>{state=s;},listen(cursor,receive,fail) {
        const sub={cursor,receive,fail}; listeners.add(sub); queueMicrotask(()=>{if(listeners.has(sub))deliver(sub);});
        return ()=>listeners.delete(sub);
    }});
    return {pager,listeners,get state(){return state;},set records(value){records=value;},get records(){return records;}, refresh(){for(const sub of [...listeners])if(listeners.has(sub))deliver(sub);}};
}
const settle = () => new Promise(resolve=>setImmediate(resolve));
test('bounded pages reach all older content and unsubscribe',async()=>{
    const f=fixture(); await settle(); assert.equal(f.state.items.length,30);
    for(let i=0;i<3;i++){f.pager.loadMore();await settle();}
    assert.equal(f.state.items.length,95);assert.equal(f.state.hasMore,false);
    f.pager.stop();assert.equal(f.listeners.size,0);
});
test('a burst larger than one page and deletions rebase without duplicates or holes',async()=>{
    const f=fixture();await settle();f.pager.loadMore();await settle();
    f.records=[...Array.from({length:40},(_,i)=>({id:String(140-i),rank:140-i})),...f.records];
    f.refresh();await settle();assert.deepEqual(f.state.items,f.records.slice(0,120));
    f.records=f.records.filter((_,i)=>i!==12&&i!==29&&i!==45);f.refresh();await settle();
    assert.deepEqual(f.state.items,f.records.slice(0,120));f.pager.stop();
});
test('stale callbacks after stop are ignored; errors can retry',async()=>{
    const f=fixture();await settle();const first=[...f.listeners][0];
    first.fail(Error('offline'));assert.equal(f.state.error.message,'offline');
    f.pager.retry();await settle();assert.equal(f.state.error,null);
    first.receive([]);assert.equal(f.state.items.length,30);
    f.pager.stop();const previous=f.state;first.receive([]);assert.equal(f.state,previous);
});
test('a healthy page update cannot clear another page’s listener failure',async()=>{
    const f=fixture();await settle();f.pager.loadMore();await settle();
    const [first,second]=[...f.listeners];second.fail(Error('permission-denied'));
    first.receive(f.records.slice(0,30));
    assert.equal(f.state.error.message,'permission-denied');
    f.pager.retry();await settle();assert.equal(f.state.error,null);f.pager.stop();
});

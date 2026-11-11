import { useEffect, useRef, useState } from 'react';
import { collection, query, where, orderBy, documentId, limit, startAfter, onSnapshot, QueryConstraint, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { livePages } from '../lib/livePages.mjs';

export const PAGE_SIZE = 30;
// JSON filter identity avoids listener restarts for unrelated context updates.
export function useLiveCollection<T>(name: string, filters: [string, string][], enabled = true, range?: {field: string; operator: '>' | '<='; milliseconds: number; direction?: 'asc' | 'desc'}) {
    const rangeIdentity = JSON.stringify(range);
    const depth = useRef(1);
    const previousBase = useRef('');
    const identity = JSON.stringify(filters);
    const [state, setState] = useState<{items:T[]; loading:boolean; error:Error|null; hasMore:boolean}>({items:[],loading:true,error:null,hasMore:false});
    const controller = useRef<ReturnType<typeof livePages> | null>(null);
    useEffect(() => {
        const base = JSON.stringify([name, identity, enabled]);
        const retain = !!rangeIdentity && previousBase.current === base;
        if (!retain) depth.current = 1;
        previousBase.current = base;
        setState(previous => ({items:retain ? previous.items : [],loading:enabled,error:null,hasMore:false}));
        if (!enabled) return;
        const constraints: QueryConstraint[] = (JSON.parse(identity) as [string,string][]).map(([field,value]) => where(field,'==',value));
        const selected = rangeIdentity ? JSON.parse(rangeIdentity) : null;
        const sortField = selected?.field || 'timestamp';
        const direction = selected?.direction || 'desc';
        if (selected) constraints.push(where(selected.field, selected.operator, Timestamp.fromMillis(selected.milliseconds)));
        const pager = livePages({
            initialPages: depth.current,
            pageSize: PAGE_SIZE,
            key: snapshot => `${snapshot.id}:${JSON.stringify(snapshot.get(sortField))}`,
            compare: (a,b) => {
                const left = a.data({serverTimestamps:'estimate'})[sortField];
                const right = b.data({serverTimestamps:'estimate'})[sortField];
                return (direction === 'asc' ? -1 : 1) * ((right?.seconds || 0) - (left?.seconds || 0) || (right?.nanoseconds || 0) - (left?.nanoseconds || 0) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
            },
            listen: (cursor, receive, fail) => onSnapshot(query(collection(db,name), ...constraints, orderBy(sortField,direction), orderBy(documentId(),direction), ...(cursor ? [startAfter(cursor)] : []), limit(PAGE_SIZE)), snapshot => receive(snapshot.docs), fail),
            publish: result => { depth.current = result.pageCount; setState(previous => ({...result, items:result.loading && !result.items.length && retain ? previous.items : result.items.map(snapshot => {
                const data = snapshot.data({serverTimestamps:'estimate'});
                const normalize = (value: any): any => value instanceof Timestamp ? value.toDate() : Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key,entry])=>[key,normalize(entry)])) : value;
                return {...normalize(data), timestamp:data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(0), id:snapshot.id} as T;
            })})); },
        });
        controller.current = pager;
        return () => { pager.stop(); controller.current = null; };
    }, [name, identity, enabled, rangeIdentity]);
    return {...state, loadMore:() => controller.current?.loadMore(), retry:() => controller.current?.retry()};
}

import { useEffect, useRef, useState } from 'react';
import { collection, query, where, orderBy, documentId, limit, startAfter, onSnapshot, QueryConstraint, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { livePages } from '../lib/livePages.mjs';

export const PAGE_SIZE = 30;
// JSON filter identity avoids listener restarts for unrelated context updates.
export function useLiveCollection<T>(name: string, filters: [string, string][], enabled = true) {
    const identity = JSON.stringify(filters);
    const [state, setState] = useState<{items:T[]; loading:boolean; error:Error|null; hasMore:boolean}>({items:[],loading:true,error:null,hasMore:false});
    const controller = useRef<ReturnType<typeof livePages> | null>(null);
    useEffect(() => {
        setState({items:[],loading:enabled,error:null,hasMore:false});
        if (!enabled) return;
        const constraints: QueryConstraint[] = (JSON.parse(identity) as [string,string][]).map(([field,value]) => where(field,'==',value));
        const pager = livePages({
            pageSize: PAGE_SIZE,
            key: snapshot => `${snapshot.id}:${JSON.stringify(snapshot.get('timestamp'))}`,
            compare: (a,b) => {
                const left = a.data({serverTimestamps:'estimate'}).timestamp;
                const right = b.data({serverTimestamps:'estimate'}).timestamp;
                return (right?.seconds || 0) - (left?.seconds || 0) || (right?.nanoseconds || 0) - (left?.nanoseconds || 0) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
            },
            listen: (cursor, receive, fail) => onSnapshot(query(collection(db,name), ...constraints, orderBy('timestamp','desc'), orderBy(documentId(),'desc'), ...(cursor ? [startAfter(cursor)] : []), limit(PAGE_SIZE)), snapshot => receive(snapshot.docs), fail),
            publish: result => setState({...result, items:result.items.map(snapshot => {
                const data = snapshot.data({serverTimestamps:'estimate'});
                const normalize = (value: any): any => value instanceof Timestamp ? value.toDate() : Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key,entry])=>[key,normalize(entry)])) : value;
                return {...normalize(data), timestamp:data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(0), id:snapshot.id} as T;
            })}),
        });
        controller.current = pager;
        return () => { pager.stop(); controller.current = null; };
    }, [name, identity, enabled]);
    return {...state, loadMore:() => controller.current?.loadMore(), retry:() => controller.current?.retry()};
}

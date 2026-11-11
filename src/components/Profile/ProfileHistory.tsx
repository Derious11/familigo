import {useState} from 'react';
import {useLiveCollection} from '../../hooks/useLiveCollection';

export default function ProfileHistory({userId}: {userId: string}) {
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState<'activityDays' | 'weightEntries'>('activityDays');
    const {items, loading, error, hasMore, loadMore, retry} = useLiveCollection<{id:string; day?:string; count?:number; value?:number; unit?:string; timestamp:Date}>(`users/${userId}/${kind}`, [], open);
    return <section className="rounded-2xl bg-brand-surface dark:bg-gray-800 p-6">
        <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className="min-h-11 text-lg font-bold">Your activity and weight history</button>
        {open && <div>
            <div className="flex gap-3 my-3" role="group" aria-label="History type">
                <button type="button" className="min-h-11 px-3 border rounded-lg" aria-pressed={kind === 'activityDays'} onClick={() => setKind('activityDays')}>Activity</button>
                <button type="button" className="min-h-11 px-3 border rounded-lg" aria-pressed={kind === 'weightEntries'} onClick={() => setKind('weightEntries')}>Weight</button>
            </div>
            {error && <p role="alert">History could not load. <button onClick={retry} className="min-h-11 underline">Retry</button></p>}
            {!loading && !error && !items.length && <p>No recorded history yet.</p>}
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">{items.map(item => <li key={item.id} className="py-3 flex flex-wrap justify-between gap-2">
                <span>{kind === 'activityDays' ? item.day : item.timestamp.toLocaleDateString()}</span>
                <span>{kind === 'activityDays' ? `${item.count} activities` : `${item.value} ${item.unit || '(unit not recorded)'}`}</span>
            </li>)}</ul>
            {loading && <p role="status">Loading history…</p>}
            {hasMore && <button disabled={loading} className="min-h-11 p-3 underline" onClick={loadMore}>Load older records</button>}
        </div>}
    </section>;
}

import {useState} from 'react';
import {createPortal} from 'react-dom';
import Modal from '../ui/Modal';
import {bannerPosition, profileBanners} from './profileArt';

interface Props {currentCoverUrl?:string; ratio:number; onSave:(url:string)=>Promise<void>; onCancel:()=>void}
export default function CoverPhotoPicker({currentCoverUrl,ratio,onSave,onCancel}:Props) {
    const [draft,setDraft]=useState(currentCoverUrl??'');
    const [busy,setBusy]=useState(false),[error,setError]=useState('');
    const choose=(url:string)=>{setDraft(url);setError('')};
    const close=()=>{if(!busy)onCancel()};
    const url=draft.trim();
    const valid=!url || profileBanners.some(b=>b.url===url) || /^https?:\/\//i.test(url) || (url.startsWith('/')&&!url.startsWith('//'));
    const save=async()=>{if(!valid||busy)return;setBusy(true);try{await onSave(url)}catch{setError('Your banner could not be saved. Please try again.');setBusy(false)}};
    return createPortal(<Modal isOpen onClose={close} title="Profile banner" footer={<div className="flex justify-end gap-3">
        <button onClick={close} disabled={busy}>Cancel</button>
        <button className="px-4 py-2 rounded-lg bg-blue-700 text-white" disabled={!valid||busy} onClick={save}>{busy?'Saving…':'Save banner'}</button></div>}>
        <div className="mb-4 overflow-hidden rounded-lg bg-gradient-to-r from-blue-300 to-purple-400" style={{aspectRatio:ratio}}>
            {url&&valid&&<img src={url} alt="Banner preview" className="w-full h-full object-cover" style={{objectPosition:bannerPosition(url)}}/>}
        </div>
        <div role="group" aria-label="Banner choices" className="grid grid-cols-2 gap-2">
            {profileBanners.map(b=><button type="button" key={b.url} aria-pressed={url===b.url} onClick={()=>choose(b.url)} className={'rounded-lg overflow-hidden border-2 text-sm '+(url===b.url?'border-blue-600':'border-gray-300')}>
                <img src={b.thumb} alt="" width="300" height="100" className="w-full"/>{b.name}</button>)}
        </div>
        <label className="block mt-4">Custom banner URL<input className="block border p-2 w-full rounded dark:bg-gray-700" type="text" value={draft} onChange={e=>choose(e.target.value)}/></label>
        <button type="button" className="min-h-11 underline" onClick={()=>choose('')}>Use default background</button>
        {!valid&&<p role="alert">Enter an image URL starting with https:// or http://.</p>}{error&&<p role="alert">{error}</p>}
    </Modal>,document.body);
}

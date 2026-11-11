import {Firestore, DocumentSnapshot, Timestamp} from "firebase-admin/firestore";
import {createHash} from "node:crypto";

export function historyRows(actor: FirebaseFirestore.DocumentData) {
  if ((actor.activityMap != null && (typeof actor.activityMap !== "object" || Array.isArray(actor.activityMap))) ||
      (actor.weightHistory != null && !Array.isArray(actor.weightHistory))) throw Error("Invalid history containers");
  const rows: {path:string; data:Record<string, unknown>}[] = [];
  for (const [day, count] of Object.entries(actor.activityMap || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) ||
      new Date(day).toISOString().slice(0, 10) !== day || !Number.isSafeInteger(count) || Number(count) < 0) {
      throw Error("Malformed legacy activity; profile was not trimmed.");
    }
    rows.push({path:`activityDays/${day}`, data:{day, count, timestamp:Timestamp.fromDate(new Date(day))}});
  }
  for (const [index, entry] of (actor.weightHistory || []).entries()) {
    if (!entry || Object.keys(entry).some(k => !["value","unit","timestamp"].includes(k)) || !Number.isFinite(entry.value) || !(entry.timestamp instanceof Timestamp)) {
      throw Error("Malformed legacy weight; profile was not trimmed.");
    }
    const id = createHash("sha256").update(JSON.stringify([index,entry.value,entry.timestamp.toMillis()])).digest("hex");
    rows.push({path:`weightEntries/legacy-${id}`,data:{value:entry.value,timestamp:entry.timestamp,...(entry.unit ? {unit:entry.unit} : {})}});
  }
  return rows;
}

type Row = ReturnType<typeof historyRows>[number];
function matches(row: Row, value: FirebaseFirestore.DocumentData | undefined) {
  if (!value || Object.keys(value).length !== Object.keys(row.data).length) return false;
  return Object.entries(row.data).every(([key,v]) => {
    if (v instanceof Timestamp) {
      if (!(value[key] instanceof Timestamp)) return false;
      // A live writer may have recorded the same daily count at the time of the event.
      return row.path.startsWith("activityDays/") ?
        value[key].toDate().toISOString().slice(0,10) === row.data.day : v.isEqual(value[key]);
    }
    return value[key] === v;
  });
}
export async function checkDestinations(db: Firestore, ref: FirebaseFirestore.DocumentReference, rows: Row[], requireAll = false) {
  for(let offset=0;offset<rows.length;offset+=100){
    const chunk=rows.slice(offset,offset+100);
    const docs=await db.getAll(...chunk.map(row=>ref.collection(row.path.split('/')[0]).doc(row.path.split('/')[1])));
    if(docs.some((doc,i)=>doc.exists ? !matches(chunk[i],doc.data()) : requireAll)) throw Error("Missing or conflicting archive record");
  }
}

export async function archiveProfileHistory(db: Firestore, snapshot: DocumentSnapshot) {
  const actor=snapshot.data();
  if(!actor || actor.progressHistoryVersion===1) return false;
  const ref=snapshot.ref, rows=historyRows(actor);
  const unchanged = async (tx: FirebaseFirestore.Transaction) => {
    const latest = await tx.get(ref);
    if (!latest.updateTime?.isEqual(snapshot.updateTime!)) throw Error("Profile changed during archive; rerun safely.");
  };
  for (let offset=0; offset<rows.length; offset+=100) {
    await db.runTransaction(async tx => {
      await unchanged(tx);
      const chunk=rows.slice(offset,offset+100);
      const docs=await tx.getAll(...chunk.map(row=>ref.collection(row.path.split('/')[0]).doc(row.path.split('/')[1])));
      docs.forEach((doc,i)=>{
        if(!doc.exists) tx.create(doc.ref,chunk[i].data);
        else if(!matches(chunk[i],doc.data())) throw Error("Conflicting archive; profile not trimmed");
      });
    });
  }
  await checkDestinations(db,ref,rows,true);
  const today=new Date().toISOString().slice(0,10);
  const cutoff = new Date(Date.now()-89*86400000).toISOString().slice(0,10);
  await db.runTransaction(async tx => {
    await unchanged(tx);
    tx.update(ref,{activityMap:Object.fromEntries(Object.entries(actor.activityMap || {}).filter(([day])=>day>=cutoff && day<=today)),weightHistory:[],progressHistoryVersion:1});
  });
  return true;
}

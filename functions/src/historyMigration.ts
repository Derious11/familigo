import {Firestore, DocumentSnapshot, Timestamp} from "firebase-admin/firestore";
import {createHash} from "node:crypto";

// Caller must save a private backup before invoking this development migration.
export async function archiveProfileHistory(db: Firestore, snapshot: DocumentSnapshot) {
  const actor = snapshot.data();
  if (!actor || actor.progressHistoryVersion === 1) return false;
  const ref = snapshot.ref;
  const rows: {path:string; data:Record<string, unknown>}[] = [];
  for (const [day, count] of Object.entries(actor.activityMap || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) ||
      new Date(day).toISOString().slice(0, 10) !== day || !Number.isSafeInteger(count) || Number(count) < 0) {
      throw Error("Malformed legacy activity; profile was not trimmed.");
    }
    rows.push({path:`activityDays/${day}`, data:{day, count, timestamp:Timestamp.fromDate(new Date(day))}});
  }
  for (const [index, entry] of (actor.weightHistory || []).entries()) {
    if (!Number.isFinite(entry.value) || !(entry.timestamp instanceof Timestamp)) {
      throw Error("Malformed legacy weight; profile was not trimmed.");
    }
    const id = createHash("sha256").update(JSON.stringify([index,entry.value,entry.timestamp.toMillis()])).digest("hex");
    rows.push({path:`weightEntries/legacy-${id}`,data:{value:entry.value,timestamp:entry.timestamp,...(entry.unit ? {unit:entry.unit} : {})}});
  }
  const unchanged = async (tx: FirebaseFirestore.Transaction) => {
    const latest = await tx.get(ref);
    if (!latest.updateTime?.isEqual(snapshot.updateTime!)) throw Error("Profile changed during archive; rerun safely.");
  };
  for (let offset=0; offset<rows.length; offset+=100) {
    await db.runTransaction(async tx => {
      await unchanged(tx);
      for (const row of rows.slice(offset,offset+100)) tx.set(ref.collection(row.path.split('/')[0]).doc(row.path.split('/')[1]),row.data);
    });
  }
  const cutoff = new Date(Date.now()-89*86400000).toISOString().slice(0,10);
  await db.runTransaction(async tx => {
    await unchanged(tx);
    tx.update(ref,{activityMap:Object.fromEntries(Object.entries(actor.activityMap || {}).filter(([day])=>day>=cutoff)),weightHistory:[],progressHistoryVersion:1});
  });
  return true;
}

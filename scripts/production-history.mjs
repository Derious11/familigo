import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url), project='familigo-11643';
const [mode,label]=process.argv.slice(2);
if(!['preview','rehearse','canary','remaining','verify'].includes(mode)||!/^history-[a-z0-9-]+$/.test(label)||process.argv.length!==4)throw Error('Specify one explicit mode and backup label');
const dir=path.resolve('.test-artifacts',label),file=path.join(dir,'profiles.dpapi');
const root=p=>'projects/'+p+'/databases/(default)/documents';
const endpoint='https://firestore.googleapis.com/v1/';
const sha=b=>createHash('sha256').update(b).digest('hex');
function crypt(data,decrypt=false){
 const operation=decrypt?'Unprotect':'Protect';
 return Buffer.from(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',
    "Add-Type -AssemblyName System.Security; $a=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $b=[Security.Cryptography.ProtectedData]::"+operation+"($a,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Write([Convert]::ToBase64String($b))"
 ],{input:data.toString('base64'),maxBuffer:64*1024*1024,windowsHide:true}).toString(),'base64');
}
const fieldsEqual=(a,b)=>{try{assert.deepEqual(a,b);return true}catch{return false}};
const check=(condition,msg)=>{if(!condition)throw Error(msg)};
function summary(doc){const f=doc.fields;return {days:Object.keys(f.activityMap?.mapValue?.fields??{}).length,weights:(f.weightHistory?.arrayValue?.values??[]).length}}
async function run(){
 if(mode==='rehearse'){
   check(process.env.FIRESTORE_EMULATOR_HOST==='127.0.0.1:8185','Dedicated local emulator required');
   const encrypted=await fs.readFile(file),backup=JSON.parse(crypt(encrypted,true));
   check(backup.project===project,'Wrong backup');
   const {Firestore}=require('../functions/node_modules/@google-cloud/firestore');
   const local=new Firestore({projectId:'demo-familigo-review'});
   const {archiveProfileHistory,historyRows,checkDestinations}=require('../functions/lib/historyMigration');
   try{for(const [i,doc] of backup.docs.entries()){
     const url='http://127.0.0.1:8185/v1/'+root('demo-familigo-review')+'/restoreHistory/'+label+'-'+i;
     const put=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({fields:doc.fields})});
     check(put.ok,'Local restore failed: HTTP '+put.status);
     const read=await fetch(url,{headers:{Authorization:'Bearer owner'}});check(read.ok&&fieldsEqual((await read.json()).fields,doc.fields),'Restored fields differ');const ref=local.doc('restoreHistory/'+label+'-'+i),before=await ref.get();
     if(before.get('progressHistoryVersion')!==1){
       const rows=historyRows(before.data());await archiveProfileHistory(local,before);
       await checkDestinations(local,ref,rows,true);
       const after=await ref.get();for(const field of ['xp','level','streak','currentWeight','lastActiveDate'])check(fieldsEqual(after.get(field),before.get(field)),'Rehearsal changed a profile total');
       check(after.get('progressHistoryVersion')===1&&after.get('weightHistory').length===0,'Rehearsal summary differs');
     }
     await local.recursiveDelete(ref);
   }
   }finally{await local.terminate()}
   await fs.writeFile(path.join(dir,'rehearsed'),sha(encrypted));
   console.log('Restored and compared every field of '+backup.docs.length+' production profiles in the local emulator.');return;
 }
 check(!process.env.FIRESTORE_EMULATOR_HOST,'Cloud mode cannot target an emulator');
 const cli=require('firebase-tools/lib/auth.js'), api=require('firebase-tools/lib/api.js');
 const {GoogleAuth}=require('../functions/node_modules/google-auth-library'),{Firestore}=require('../functions/node_modules/@google-cloud/firestore');
 const {historyRows,checkDestinations,archiveProfileHistory}=require('../functions/lib/historyMigration');
 const account=cli.getProjectDefaultAccount(process.cwd());
 const auth=new GoogleAuth({credentials:{type:'authorized_user',client_id:api.clientId(),client_secret:api.clientSecret(),refresh_token:account.tokens.refresh_token},scopes:['https://www.googleapis.com/auth/cloud-platform'+(['preview','verify'].includes(mode)?'.read-only':'')]});
 const db=new Firestore({projectId:project,auth});
 const read=async name=>(await auth.request({url:endpoint+name})).data;
 const rest=async(id)=>read(root(project)+'/users/'+encodeURIComponent(id));
 try{
 if(mode==='preview'){
   const docs=[];let token;
   do{const page=(await auth.request({url:endpoint+root(project)+'/users',params:{pageSize:50,pageToken:token}})).data;docs.push(...(page.documents??[]));token=page.nextPageToken}while(token);
   let days=0,weights=0,pending=0;
   for(const doc of docs){const s=await db.doc('users/'+doc.name.split('/').pop()).get();if(s.get('progressHistoryVersion')===1)continue;const rows=historyRows(s.data());await checkDestinations(db,s.ref,rows);const n=summary(doc);days+=n.days;weights+=n.weights;pending++}
   await fs.mkdir(dir);const encrypted=crypt(Buffer.from(JSON.stringify({project,created:new Date().toISOString(),docs})));
   await fs.writeFile(file,encrypted,{flag:'wx'});console.log(JSON.stringify({profiles:docs.length,pending,days,weights,backup:label}));return;
 }
 const encrypted=await fs.readFile(file),digest=sha(encrypted);
 check((await fs.readFile(path.join(dir,'rehearsed'),'utf8'))===digest,'Backup not restore-tested');
 const backup=JSON.parse(crypt(encrypted,true));check(backup.project===project,'Wrong project');
 if(mode!=='verify')check(Date.now()-Date.parse(backup.created)<24*3600000,'Refresh backup');
 const targets=backup.docs.filter(d=>d.fields.progressHistoryVersion?.integerValue!=='1').sort((a,b)=>{const score=d=>summary(d).weights*10000+summary(d).days;return score(b)-score(a)});
 // Convert just the two source fields via SDK-native Timestamps for archive comparisons.
 const {Timestamp}=require('../functions/node_modules/firebase-admin/firestore');
 function decode(v){if(v.timestampValue){const iso=v.timestampValue;return new Timestamp(Math.floor(Date.parse(iso)/1000),Number((iso.split('.')[1]?.replace('Z','')||'').padEnd(9,'0')))}
 if('integerValue' in v)return Number(v.integerValue);if('doubleValue' in v)return v.doubleValue;if('stringValue' in v)return v.stringValue;
 if(v.mapValue)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,decode(x)]));if(v.arrayValue)return (v.arrayValue.values||[]).map(decode);throw Error('Unsupported history type')}
 async function verify(doc){
   const id=doc.name.split('/').pop(),latest=await rest(id),f=latest.fields,orig=doc.fields;
   check(f.progressHistoryVersion?.integerValue==='1' && f.weightHistory?.arrayValue && !(f.weightHistory.arrayValue.values||[]).length,'Summary marker/weights differ');
   const omit=o=>Object.fromEntries(Object.entries(o).filter(([k])=>!['activityMap','weightHistory','progressHistoryVersion'].includes(k)));
   check(fieldsEqual(omit(f),omit(orig)),'Non-history fields changed; inspect before continuing');
   const cutoff=new Date(Date.now()-89*86400000).toISOString().slice(0,10),today=new Date().toISOString().slice(0,10);
   const old=orig.activityMap?.mapValue?.fields||{};
   check(fieldsEqual(f.activityMap?.mapValue?.fields||{},Object.fromEntries(Object.entries(old).filter(([k])=>k>=cutoff&&k<=today))),'Recent mirror differs');
   const rows=historyRows({activityMap:orig.activityMap?decode(orig.activityMap):{},weightHistory:orig.weightHistory?decode(orig.weightHistory):[]});
   await checkDestinations(db,db.doc('users/'+id),rows,true);
 }
 async function apply(doc){
   const id=doc.name.split('/').pop(),snap=await db.doc('users/'+id).get(),current=await rest(id);
   if(snap.get('progressHistoryVersion')!==1){
     check(current.updateTime===doc.updateTime&&fieldsEqual(current.fields,doc.fields),'Profile changed since backup; refresh backup');
     check(snap.updateTime.isEqual(decode({timestampValue:doc.updateTime})),'Snapshot changed');
     await archiveProfileHistory(db,snap);
   }
   await verify(doc);
 }
 if(mode==='canary'){if(targets.length)await apply(targets[0]);await fs.writeFile(path.join(dir,'canary'),digest);console.log('Canary verified: '+Math.min(1,targets.length));return}
 if(mode==='remaining'){check((await fs.readFile(path.join(dir,'canary'),'utf8'))===digest,'Canary required');if(targets.length)await verify(targets[0]);for(const doc of targets.slice(1))await apply(doc)}
 for(const doc of targets)await verify(doc);
 const current=await db.collection('users').select('progressHistoryVersion').get();check(current.docs.every(d=>d.get('progressHistoryVersion')===1),'Unmigrated profile remains');
 console.log(JSON.stringify({verifiedProfiles:targets.length,allProfilesVersionOne:current.size,archivedDays:targets.reduce((n,d)=>n+summary(d).days,0),archivedWeights:targets.reduce((n,d)=>n+summary(d).weights,0)}));
 }finally{await db.terminate()}
}
run().catch(e=>{console.error('History operation stopped:',e.response?'cloud request failed ('+e.response.status+')':e.message);process.exitCode=1});

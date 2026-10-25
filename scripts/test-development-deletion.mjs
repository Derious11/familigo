// Explicit development-only smoke test; synthetic author has no account/tokens.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
if(process.argv[2]!=='familigo-dev-11643'||process.env.FIRESTORE_EMULATOR_HOST)throw Error('Explicit development project required.');
const cli=require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/auth.js');
const api=require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/api.js');
const account=cli.getProjectDefaultAccount(process.cwd());
const {GoogleAuth}=require('../functions/node_modules/google-auth-library');
const {Firestore,FieldValue}=require('../functions/node_modules/@google-cloud/firestore');
const auth=new GoogleAuth({credentials:{type:'authorized_user',client_id:api.clientId(),client_secret:api.clientSecret(),refresh_token:account.tokens.refresh_token},scopes:['https://www.googleapis.com/auth/cloud-platform']});
const db=new Firestore({projectId:'familigo-dev-11643',auth});
const id=`release-review-${Date.now()}`;
const challenge=db.doc(`challenges/${id}`),family=db.doc(`familyCircles/${id}`),job=db.doc(`contentDeletionJobs/challenge_${id}`);
const replies=Array.from({length:101},(_,i)=>db.doc(`replies/${id}-${i}`));
try{
  const batch=db.batch();batch.create(family,{memberIds:[],members:{}});
  batch.create(challenge,{familyCircleId:id,challenger:{id,name:'Review fixture'},exercise:{name:'Review fixture'},timestamp:new Date(),expiresAt:new Date(),deletingJobId:job.id});
  for(const ref of replies)batch.create(ref,{familyCircleId:id,challengeId:id,user:{id,name:'Review fixture'},text:'Synthetic deletion fixture',timestamp:new Date()});
  await batch.commit();
  await job.create({kind:'challenge',targetId:id,challengeId:id,familyId:id,requestedBy:id,step:0,status:'pending',createdAt:FieldValue.serverTimestamp()});
  const deadline=Date.now()+120000;let completed=false;
  while(Date.now()<deadline){const data=(await job.get()).data();if(data?.status==='complete'){completed=true;break;}await new Promise(r=>setTimeout(r,2000));}
  if(!completed)throw Error('Development worker did not finish within two minutes.');
  const remaining=await db.getAll(challenge,...replies);
  if(remaining.some(doc=>doc.exists))throw Error('Worker left fixture content behind.');
  const result={project:'familigo-dev-11643',replyCount:101,workerCompleted:true,allFixtureContentDeleted:true};
  await fs.writeFile('artifacts/release-review/development-deletion.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{
  // Exact generated references only; never query or delete real user content.
  const cleanup=db.batch();for(const ref of [challenge,family,job,...replies])cleanup.delete(ref);await cleanup.commit();await db.terminate();
}

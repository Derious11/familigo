const assert = require('node:assert/strict');
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8185' || process.env.GCLOUD_PROJECT !== 'demo-familigo-review') throw Error('Dedicated local emulator required.');
const {db} = require('../functions/lib/init');
const {deleteFamilyContent, processDeletionStep} = require('../functions/lib/callables/deleteContent');
const {recordChallengeReply, recordChallengeReaction} = require('../functions/lib/achievements/backend');
const suffix=Date.now();const family=`delete-family-${suffix}`;const author=`author-${suffix}`;const other=`other-${suffix}`;
const context={auth:{uid:author,token:{}}};
const reply=(id,parentId)=>({familyCircleId:family,challengeId:`challenge-${suffix}`,user:{id:author,name:'Author'},text:id,parentId:parentId||'',timestamp:new Date()});
(async()=>{
try {
  await db.doc(`users/${author}`).set({role:'adult',status:'active',familyCircleId:family});
  await db.doc(`users/${other}`).set({role:'adult',status:'active',familyCircleId:family});
  await db.doc(`familyCircles/${family}`).set({memberIds:[author,other],members:{[author]:true,[other]:true}});
  const challengeId=`challenge-${suffix}`;
  await db.doc(`challenges/${challengeId}`).set({familyCircleId:family,challenger:{id:author},timestamp:new Date()});
  const root=`root-${suffix}`;const child=`child-${suffix}`;const grandchild=`grandchild-${suffix}`;const sibling=`sibling-${suffix}`;
  for(const [id,parent] of [[root,''],[child,root],[grandchild,child],[sibling,'']])await db.doc(`replies/${id}`).set(reply(id,parent));
  await assert.rejects(()=>deleteFamilyContent.run({kind:'challenge',targetId:challengeId,familyCircleId:family},{auth:{uid:other,token:{}}}),e=>e.code==='permission-denied');
  const {jobId}=await deleteFamilyContent.run({kind:'reply',targetId:root,familyCircleId:family},context);
  await assert.rejects(()=>recordChallengeReply.run({actorId:author,challengeId,familyCircleId:family,requestId:`race-${suffix}`,text:'Concurrent reply'},context));
  await assert.rejects(()=>recordChallengeReaction.run({actorId:author,replyId:sibling,familyCircleId:family,emoji:'❤️'},context));
  async function drain(id){
    for(let i=0;i<40;i++){
      const job=(await db.doc(`contentDeletionJobs/${id}`).get()).data();
      if(job.status==='complete')return;
      // Duplicate delivery of the same step must commit only once.
      await Promise.all([processDeletionStep(id,job.step),processDeletionStep(id,job.step)]);
    }
    throw Error('Deletion failed to finish');
  }
  await drain(jobId);
  for(const id of [root,child,grandchild])assert.equal((await db.doc(`replies/${id}`).get()).exists,false);
  assert.equal((await db.doc(`replies/${sibling}`).get()).exists,true);
  assert.equal((await db.doc(`challenges/${challengeId}`).get()).data().deletingJobId,undefined);
  assert.equal((await deleteFamilyContent.run({kind:'reply',targetId:root,familyCircleId:family},context)).jobId,jobId);
  console.log('PASS: authorized nested reply cascade, unrelated sibling preserved, concurrency lock, duplicate delivery and retry');
  for(let page=0;page<7;page++){
    const batch=db.batch();for(let i=0;i<100;i++)batch.set(db.doc(`replies/large-${suffix}-${page}-${i}`),reply('large',''));await batch.commit();
  }
  const deletion=await deleteFamilyContent.run({kind:'challenge',targetId:challengeId,familyCircleId:family},context);
  await drain(deletion.jobId);
  assert.equal((await db.doc(`challenges/${challengeId}`).get()).exists,false);
  assert.equal((await db.collection('replies').where('challengeId','==',challengeId).limit(1).get()).empty,true);
  console.log('PASS: 701 replies deleted in bounded transactions, challenge removed only after cascade finishes');
} finally {await db.terminate();}
})().catch(error=>{console.error(error);process.exitCode=1;});

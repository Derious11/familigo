// Synthetic, local-only marketing fixtures. Never connects to a live project.
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9095') throw new Error('Local demo emulators required.');
process.env.GCLOUD_PROJECT = 'demo-familigo-redesign';
const admin = require('../functions/node_modules/firebase-admin');
const {db} = require('../functions/lib/init');
const {emptyState, BADGES} = require('../functions/lib/achievements/catalog');
const {evaluate} = require('../functions/lib/achievements/engine');
const now = Date.now(); const day = 86400000; const uid = 'marketing-jacob'; const familyId = 'marketing-rivera';
try {
  try {await admin.auth().createUser({uid,email:'jacob@example.test',password:'Synthetic-Demo-42!',displayName:'Jacob Rivera',emailVerified:true});} catch(error) {if(error.code!=='auth/uid-already-exists') throw error;}
  let state=emptyState();
  for(const offset of [10,9,8,7,3,1,0]) state=evaluate(state,{kind:'completion',at:now-offset*day,category:offset%2?'walk':'run'},true).state;
  for(const kind of ['created','messages','comments','buddy','contributions','reactions','reactions']) state=evaluate(state,{kind,at:now},true).state;
  for(const award of Object.values(state.awards)) award.celebratedAt=now;
  const activityMap={}; for(const offset of [10,9,8,7,3,1,0]) activityMap[new Date(now-offset*day).toISOString().slice(0,10)]=1;
  await db.doc(`users/${uid}`).set({name:'Jacob Rivera',role:'adult',status:'active',familyCircleId:familyId,emailVerified:true,hasAvatar:false,badges:[],achievementCount:Object.keys(state.awards).length,xp:1250,level:3,streak:4,lastActiveDate:admin.firestore.Timestamp.now(),activityMap});
  for(const [id,name,role] of [['marketing-sara','Sara Rivera','teen'],['marketing-mia','Mia Rivera','child']]) await db.doc(`users/${id}`).set({name,role,status:'active',parentId:uid,familyCircleId:familyId,hasAvatar:false,badges:[],xp:750,level:2,streak:3});
  await db.doc(`familyCircles/${familyId}`).set({name:'The Rivera Family',chatName:'Rivera Family Huddle',motto:'Little moves. Shared wins.',memberIds:[uid,'marketing-sara','marketing-mia'],members:{[uid]:true,'marketing-sara':true,'marketing-mia':true},adminIds:[uid],inviteCode:'DEMO-ONLY',messageCount:5,betaApproved:true});
  await db.doc(`achievementProfiles/${uid}`).set({familyCircleId:familyId,pinnedBadgeIds:['first_steps','on_a_roll','five_alive'],state});
  const familyState=evaluate(emptyState(),{kind:'fullHouse',at:now-2*day},true).state;
  await db.doc(`familyAchievements/${familyId}`).set({familyCircleId:familyId,state:familyState});
  const messages=[
    {senderId:'marketing-sara',senderName:'Sara Rivera',type:'text',text:'We all finished our walk! Same time tomorrow? 🌤️'},
    {senderId:'',senderName:'Your family',type:'achievement',badgeId:'full_house',text:'Everyone in the shared challenge completed their part!'},
    {senderId:uid,senderName:'Jacob Rivera',type:'text',text:'Proud of our little team. Let’s keep it going!'},
    {senderId:uid,senderName:'Jacob Rivera',type:'achievement',badgeId:'on_a_roll',text:BADGES.find(b=>b.id==='on_a_roll').description},
    {senderId:'marketing-mia',senderName:'Mia Rivera',type:'text',text:'High five, Dad! 🙌'},
  ];
  for(let i=0;i<messages.length;i++) await db.doc(`messages/marketing-${i}`).set({...messages[i],familyCircleId:familyId,timestamp:admin.firestore.Timestamp.fromMillis(now-(messages.length-i)*60000)});
  await db.doc('challenges/marketing-walk').set({familyCircleId:familyId,challenger:{id:uid,name:'Jacob Rivera'},exercise:{name:'Walk',description:'A little fresh air, together.',visualGuideUrl:'/assets/walk_ch.mp4'},target:'A 20-minute family walk',type:'individual',participationScope:'family',timestamp:admin.firestore.Timestamp.fromMillis(now-day),expiresAt:admin.firestore.Timestamp.fromMillis(now+day),participantIds:[uid,'marketing-sara','marketing-mia'],completedBy:[uid,'marketing-sara','marketing-mia'],completionTimes:{[uid]:now-3600000,'marketing-sara':now-3500000,'marketing-mia':now-3400000},mediaUrl:'/assets/walk_ch.mp4'});
  console.log('Synthetic achievement marketing demo seeded. No live data accessed.');
} finally {await admin.app().delete();}

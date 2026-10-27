import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const project=process.argv[2];
if(project!=='familigo-dev-11643'||process.env.FIRESTORE_EMULATOR_HOST)throw Error('Development project required.');
const cli=require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/auth.js');
const api=require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/api.js');
const {GoogleAuth}=require('../functions/node_modules/google-auth-library');
const {Firestore}=require('../functions/node_modules/@google-cloud/firestore');
const {archiveProfileHistory}=require('../functions/lib/historyMigration');
const account=cli.getProjectDefaultAccount(process.cwd());
const auth=new GoogleAuth({credentials:{type:'authorized_user',client_id:api.clientId(),client_secret:api.clientSecret(),refresh_token:account.tokens.refresh_token},scopes:['https://www.googleapis.com/auth/cloud-platform']});
const db=new Firestore({projectId:project,auth});
const apply=process.argv.includes('--apply');
const backup='.test-artifacts/profile-history-backup-'+Date.now();
let cursor;let reviewed=0,migrated=0;
try{
 if(apply)await fs.mkdir(backup,{recursive:true});
 for(;;){
  let q=db.collection('users').orderBy('__name__').limit(50);if(cursor)q=q.startAfter(cursor);
  const page=await q.get();if(page.empty)break;
  for(const snapshot of page.docs){
   reviewed++;if(snapshot.data().progressHistoryVersion===1)continue;
   if(apply){
    await fs.writeFile(backup+'/'+snapshot.id+'.json',JSON.stringify({project,path:snapshot.ref.path,updateTime:snapshot.updateTime,data:snapshot.data()}),{flag:'wx'});
    if(await archiveProfileHistory(db,snapshot))migrated++;
   }
  }
  cursor=page.docs.at(-1);if(page.size<50)break;
 }
 console.log(JSON.stringify({mode:apply?'applied':'preview',reviewed,migrated,backup:apply?backup:undefined}));
}finally{await db.terminate()}

// Read-only schema audit. Fetch only ordering fields, in bounded pages; never
// print document IDs, messages, user profiles or authentication material.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const project=process.argv[2];
if (!['familigo-11643','familigo-dev-11643'].includes(project) || process.env.FIRESTORE_EMULATOR_HOST) throw Error('Explicit live project required without emulator overrides.');
const cli=require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/auth.js');
const api=require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/api.js');
const account=cli.getProjectDefaultAccount(process.cwd());
if(!account?.tokens?.refresh_token)throw Error('Existing Firebase CLI authentication required.');
const {GoogleAuth}=require('../functions/node_modules/google-auth-library');
const {Firestore,FieldPath,Timestamp}=require('../functions/node_modules/@google-cloud/firestore');
const auth=new GoogleAuth({credentials:{type:'authorized_user',client_id:api.clientId(),client_secret:api.clientSecret(),refresh_token:account.tokens.refresh_token},scopes:['https://www.googleapis.com/auth/cloud-platform']});
const db=new Firestore({projectId:project,auth});
const result={project,readOnly:true,collections:{}};
try {
  for(const name of ['messages','challenges','replies']){
    const summary={documents:0,missingTimestamp:0,invalidTimestamp:0,missingExpiry:0};let cursor;
    for(;;){
      const base=db.collection(name).select('timestamp','expiresAt').orderBy(FieldPath.documentId()).limit(200);
      const page=await (cursor?base.startAfter(cursor):base).get();
      for(const doc of page.docs){const data=doc.data();summary.documents++;if(!('timestamp' in data))summary.missingTimestamp++;else if(!(data.timestamp instanceof Timestamp))summary.invalidTimestamp++;if(name==='challenges'&&!(data.expiresAt instanceof Timestamp))summary.missingExpiry++;}
      if(page.size<200)break;
      if(summary.documents>=100000)throw Error('Audit read ceiling reached; partial counts are not a completed audit.');
      cursor=page.docs.at(-1);
    }
    result.collections[name]=summary;
  }
  await fs.writeFile(`artifacts/release-review/ordering-audit-${project}.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
} finally {await db.terminate();}

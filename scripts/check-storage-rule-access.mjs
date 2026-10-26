// Non-interactive Firebase deploy skips this IAM prerequisite. Check explicitly.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
if(process.argv[2]!=='familigo-dev-11643')throw Error('Explicit development project required.');
const cli=require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/auth.js');
const api=require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/api.js');
const {GoogleAuth}=require('../functions/node_modules/google-auth-library');
const account=cli.getProjectDefaultAccount(process.cwd());
const auth=new GoogleAuth({credentials:{type:'authorized_user',client_id:api.clientId(),client_secret:api.clientSecret(),refresh_token:account.tokens.refresh_token},scopes:['https://www.googleapis.com/auth/cloud-platform']});
const base='https://cloudresourcemanager.googleapis.com/v1/projects/familigo-dev-11643';
const role='roles/firebaserules.firestoreServiceAgent';
try{
 const {data:project}=await auth.request({url:base});
 const member=`serviceAccount:service-${project.projectNumber}@gcp-sa-firebasestorage.iam.gserviceaccount.com`;
 const read=async()=> (await auth.request({url:base+':getIamPolicy',method:'POST',data:{options:{requestedPolicyVersion:3}}})).data;
 const hasRole=policy=>policy.bindings?.some(b=>b.role===role&&!b.condition&&b.members.includes(member));
 const policy=await read();
 if(!hasRole(policy)&&process.argv.includes('--apply')){
  const binding=policy.bindings.find(b=>b.role===role&&!b.condition);
  if(binding)binding.members.push(member);else policy.bindings.push({role,members:[member]});
  await auth.request({url:base+':setIamPolicy',method:'POST',data:{policy}});
 }
 const ready=hasRole(await read());console.log(JSON.stringify({project:'familigo-dev-11643',role,storageCrossServiceAccess:ready}));
 if(!ready)process.exitCode=1;
}catch(e){console.error('Storage IAM check failed (HTTP '+(e.response?.status||'unknown')+').');process.exitCode=1;}

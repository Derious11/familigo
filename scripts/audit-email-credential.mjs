// Read-only credential dependency audit. Never output credential values or raw API responses.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const cli=require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/auth.js');
const api=require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/api.js');
const {GoogleAuth}=require('../functions/node_modules/google-auth-library');
const account=cli.getProjectDefaultAccount(process.cwd());
const auth=new GoogleAuth({credentials:{type:'authorized_user',client_id:api.clientId(),client_secret:api.clientSecret(),refresh_token:account.tokens.refresh_token},scopes:['https://www.googleapis.com/auth/cloud-platform']});
try {
  let exposed;
  for(const project of ['familigo-11643','familigo-dev-11643']){
    const {data}=await auth.request({url:`https://cloudfunctions.googleapis.com/v1/projects/${project}/locations/-/functions`});
    const functions=data.functions||[];
    const dependencies=functions.filter(f=>f.environmentVariables?.RESEND_API_KEY||f.secretEnvironmentVariables?.some(s=>s.key==='RESEND_API_KEY')).map(f=>({name:f.name.split('/').at(-1),plainEnvironment:Boolean(f.environmentVariables?.RESEND_API_KEY),secretVersions:(f.secretEnvironmentVariables||[]).filter(s=>s.key==='RESEND_API_KEY').map(s=>s.version)}));
    if(project==='familigo-11643')exposed=functions.find(f=>f.name.endsWith('/generateThumbnail'))?.environmentVariables?.RESEND_API_KEY;
    console.log(JSON.stringify({project,dependencies}));
  }
  if(exposed){
    for(const project of ['familigo-11643','familigo-dev-11643']){
      const {data}=await auth.request({url:`https://secretmanager.googleapis.com/v1/projects/${project}/secrets/RESEND_API_KEY/versions/1:access`});
      const secret=Buffer.from(data.payload.data,'base64').toString('utf8').trim();
      console.log(JSON.stringify({project,secretMatchesExposedEnvironment:secret===exposed.trim()}));
    }
    const response=await fetch('https://api.resend.com/api-keys',{headers:{Authorization:`Bearer ${exposed}`}});
    const result=await response.json();
    console.log(JSON.stringify({exposedCredentialCanManageKeys:response.ok,httpStatus:response.status,errorType:response.ok?undefined:result.name,providerReportsInvalidKey:/api key is invalid|invalid api key/i.test(result.message||''),hasExpectedKeyPrefix:exposed.startsWith('re_'),looksLikePlaceholder:/placeholder|replace[_ -]?me|your[_ -]?(api|resend)/i.test(exposed)}));
  }
} catch(error){ console.error(`Credential audit failed (HTTP ${error?.response?.status||'unavailable'}). No raw error emitted.`); process.exitCode=1; }

// Narrow configuration repair: preserve source, runtime and every other environment entry.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const cli=require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/auth.js');
const api=require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/api.js');
const {GoogleAuth}=require('../functions/node_modules/google-auth-library');
const account=cli.getProjectDefaultAccount(process.cwd());
const auth=new GoogleAuth({credentials:{type:'authorized_user',client_id:api.clientId(),client_secret:api.clientSecret(),refresh_token:account.tokens.refresh_token},scopes:['https://www.googleapis.com/auth/cloud-platform']});
const url='https://cloudfunctions.googleapis.com/v1/projects/familigo-11643/locations/us-central1/functions/generateThumbnail';
let sensitiveValues=Object.values(account.tokens).filter(v=>typeof v==='string');
try{
  const {data:before}=await auth.request({url});
  const environmentVariables={...before.environmentVariables};
  sensitiveValues.push(...Object.values(environmentVariables).filter(v=>typeof v==='string'));
  if(!Object.hasOwn(environmentVariables,'RESEND_API_KEY')){console.log('Obsolete variable already absent.');process.exit(0);}
  const response=await fetch('https://api.resend.com/api-keys',{headers:{Authorization:`Bearer ${environmentVariables.RESEND_API_KEY}`}});
  const validation=await response.json();
  if(response.ok||!/api key is invalid|invalid api key/i.test(validation.message||''))throw Error('Cannot confirm obsolete credential.');
  delete environmentVariables.RESEND_API_KEY;
  // Returned by GET but reserved/injected by the platform; PATCH rejects it.
  delete environmentVariables.GCLOUD_PROJECT;
  const {data:operation}=await auth.request({url:`${url}?updateMask=environmentVariables`,method:'PATCH',data:{name:before.name,environmentVariables}});
  console.log(JSON.stringify({operation:operation.name,action:'Remove obsolete RESEND_API_KEY from generateThumbnail'}));
  for(let i=0;i<120;i++){
    const {data:state}=await auth.request({url:`https://cloudfunctions.googleapis.com/v1/${operation.name}`});
    if(state.done){if(state.error)throw Error('Configuration operation failed.');
      const {data:after}=await auth.request({url});
      if(after.environmentVariables?.RESEND_API_KEY||after.status!=='ACTIVE')throw Error('Configuration verification failed.');
      console.log('Verified: function ACTIVE; obsolete credential absent.');process.exit(0);
    }
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
  throw Error('Operation remains pending; inspect reported operation.');
}catch(error){let message=JSON.stringify(error?.response?.data?.error||{message:error.message});for(const value of sensitiveValues.sort((a,b)=>b.length-a.length))if(value)message=message.split(value).join('[redacted]');message=message.replace(/re_[A-Za-z0-9_-]+/g,'[redacted]');console.error(JSON.stringify({cleanupComplete:false,httpStatus:error?.response?.status||null,message:message.slice(0,1800)}));process.exitCode=1;}

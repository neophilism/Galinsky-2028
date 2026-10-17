// Only anonymous, temporary page-view IDs; no identity, query or referrer data.
export const VISITOR_PAGES=Object.freeze([
 {path:'/',label:'Home'},
 {path:'/issues/',label:'Issues overview'},
 {path:'/issues/kirk-evers/',label:'Kirk–Evers'},
 {path:'/issues/garden/',label:'The Garden'},
 {path:'/issues/cornerstone/',label:'The Cornerstone'},
 {path:'/volunteer/',label:'Volunteer'},
 {path:'/donate/',label:'Donate'},
 {path:'/notices/',label:'Notices'}
]);
export const VISITOR_WINDOWS=Object.freeze({day:24,week:168,month:720});
const paths=new Set(VISITOR_PAGES.map(p=>p.path));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseVisitorEvent(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
  Object.keys(value).sort().join(',')!=='action,path,seconds,viewId')throw Error('Invalid visitor event.');
 const {action,path,seconds,viewId}=value;
 if(!['start','pulse','end'].includes(action)||!paths.has(path)||!uuid.test(viewId)||
  !Number.isSafeInteger(seconds)||seconds<0||seconds>14400)throw Error('Invalid visitor event.');
 return {action,path,seconds,viewId};
}
export function visitorRange(input){
 if(typeof input!=='string'||!Object.hasOwn(VISITOR_WINDOWS,input))throw Error('Invalid analytics range.');
 return input;
}

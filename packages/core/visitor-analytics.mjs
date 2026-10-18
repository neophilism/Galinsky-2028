// Only anonymous, temporary page-view IDs; no identity, query or referrer data.
export const VISITOR_PAGES=Object.freeze([
 {path:'/',label:'Home'},
 {path:'/issues/',label:'Issues overview'},
 {path:'/issues/kirk-evers/',label:'Kirk–Evers'},
 {path:'/issues/garden/',label:'The Garden'},
 {path:'/issues/cornerstone/',label:'The Cornerstone'},
 {path:'/volunteer/',label:'Volunteer'},
 {path:'/donate/',label:'Donate'},
 {path:'/policies/eternal-liberty/',label:'Eternal Liberty'},
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


// Rich, first-party interactions: deliberate, fixed vocabularies prevent
// arbitrary HTML/URLs/input values from being placed in event rows.
export const VISITOR_ACTIONS=Object.freeze([
 'link_click','button_click','accordion_open','accordion_close',
 'section_enter','section_time','scroll_depth','hover_time',
 'field_focus','field_change','field_invalid','form_submit','form_abandon',
 'media_play','media_pause','media_end','media_seek','media_progress',
 'copy','share','download','click_heatmap',
 'rage_click','dead_click','scroll_direction','scroll_speed','navigation_attempt','navigation_stall','navigation_http_error',
 'javascript_error','promise_rejection','resource_error','resource_slow','device_class','funnel_step',
 'perf_ttfb','perf_fcp','perf_lcp','perf_cls','perf_interaction_delay','perf_longtask',
 'youtube_play','youtube_pause','youtube_end','youtube_progress','youtube_error'
]);
export const VISITOR_DETAILS=Object.freeze([
 'none','home','issues','kirk-evers','garden','cornerstone','volunteer','donate','notices','eternal-liberty',
 'portal','external','anchor','document','other',
 'd10','d25','d50','d75','d90','d100','q25','q50','q75','q100',
 'up','down','slow','medium','fast','mobile','tablet','desktop','script','image','style','font','media',
 'http4','http5','home_view','home_issues','home_donate','home_volunteer','donate_view','donate_choice','donate_handoff','volunteer_view','volunteer_role',
 'volunteer_handoff','issues_view','issues_policy','policy_view','policy_media'
]);
const actionSet=new Set(VISITOR_ACTIONS);
const detailSet=new Set(VISITOR_DETAILS);
const targetPattern=/^(?:[slbafmp](?:[1-9]|[1-9][0-9]{1,2})|p0)$/;
const schema=['amount','detail','kind','seq','target'].join(',');
const targetTypes={
 link_click:'l',button_click:'b',accordion_open:'a',accordion_close:'a',
 section_enter:'s',section_time:'s',scroll_depth:'p',hover_time:'l',
 field_focus:'f',field_change:'f',field_invalid:'f',form_submit:'f',form_abandon:'f',
 media_play:'m',media_pause:'m',media_end:'m',media_seek:'m',media_progress:'m',
 copy:'s',share:'b',download:'l',click_heatmap:'p',
 rage_click:'s',dead_click:'s',scroll_direction:'p',scroll_speed:'p',
 navigation_attempt:'p',navigation_stall:'p',navigation_http_error:'p',
 javascript_error:'p',promise_rejection:'p',resource_error:'p',resource_slow:'p',device_class:'p',funnel_step:'p',
 perf_ttfb:'p',perf_fcp:'p',perf_lcp:'p',perf_cls:'p',perf_interaction_delay:'p',perf_longtask:'p',
 youtube_play:'m',youtube_pause:'m',youtube_end:'m',youtube_progress:'m',youtube_error:'m'
};
export function parseInteraction(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
  Object.keys(value).sort().join(',')!==schema)throw Error('Invalid interaction.');
 const {seq,kind,target,detail,amount}=value;
 if(!Number.isSafeInteger(seq)||seq<1||seq>2000||
  !actionSet.has(kind)||typeof target!=='string'||!targetPattern.test(target)||
  target[0]!==targetTypes[kind]||!detailSet.has(detail)||
  !Number.isSafeInteger(amount)||amount<0||amount>14400)throw Error('Invalid interaction.');
 if((kind==='click_heatmap'&&(target!=='p0'||amount>399))||
   (kind==='scroll_depth'&&(target!=='p0'||!['d10','d25','d50','d75','d90','d100'].includes(detail)))||
   (kind==='media_progress'&&!['q25','q50','q75','q100'].includes(detail))||
   (kind==='section_time'&&amount>60)||
   (kind==='hover_time'&&amount>300)||
   (['scroll_direction','scroll_speed','navigation_attempt','navigation_stall',
     'javascript_error','promise_rejection','rage_click','dead_click','device_class','funnel_step',
     'youtube_play','youtube_pause','youtube_end','youtube_progress','youtube_error',
     'navigation_http_error','resource_error'].includes(kind)&&amount!==0)||
   (['scroll_depth','scroll_direction','scroll_speed','navigation_attempt','navigation_stall',
     'navigation_http_error','javascript_error','promise_rejection','resource_error','resource_slow',
     'device_class','funnel_step','perf_ttfb','perf_fcp','perf_lcp','perf_cls',
     'perf_interaction_delay','perf_longtask'].includes(kind)&&target!=='p0')||
   (kind==='scroll_direction'&&!['up','down'].includes(detail))||
   (kind==='scroll_speed'&&!['slow','medium','fast'].includes(detail))||
   (kind==='device_class'&&!['mobile','tablet','desktop'].includes(detail))||
   (kind==='navigation_http_error'&&!['http4','http5'].includes(detail))||
   (['resource_error','resource_slow'].includes(kind)&&!['script','image','style','font','media','other'].includes(detail))||
   (kind==='funnel_step'&&!['home_view','home_issues','home_donate','home_volunteer','donate_view','donate_choice','donate_handoff','volunteer_view',
      'volunteer_role','volunteer_handoff','issues_view','issues_policy','policy_view','policy_media'].includes(detail))||
   (kind==='youtube_progress'&&!['q25','q50','q75','q100'].includes(detail))||
   (['resource_slow','perf_ttfb','perf_fcp','perf_lcp','perf_cls','perf_interaction_delay','perf_longtask'].includes(kind)&&amount===0)||
   (!['section_time','hover_time','media_seek','click_heatmap','resource_slow','perf_ttfb','perf_fcp',
       'perf_lcp','perf_cls','perf_interaction_delay','perf_longtask'].includes(kind)&&amount!==0))throw Error('Invalid interaction.');
 return {seq,kind,target,detail,amount};
}
export function parseVisitorPayload(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid analytics payload.');
 const keys=Object.keys(value).sort().join(',');
 if(keys==='events,path,viewId'){
  if(!paths.has(value.path)||!uuid.test(value.viewId)||
   !Array.isArray(value.events)||!value.events.length||value.events.length>16)throw Error('Invalid analytics batch.');
  const events=value.events.map(parseInteraction),sequences=new Set(events.map(x=>x.seq));
  if(sequences.size!==events.length)throw Error('Duplicated event sequence.');
  return {path:value.path,viewId:value.viewId,events};
 }
 return parseVisitorEvent(value);
}
export function visitorPage(input){
 if(typeof input!=='string'||!paths.has(input))throw Error('Invalid analytics page.');
 return input;
}

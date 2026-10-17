// Generic editorial contracts only. All real names, text and themes are data.
export const CAMPAIGN_SCHEMA_VERSION = 1;
export const CAMPAIGN_RECORD_PREFIX = 'campaign.document.';
export const CAMPAIGN_PUBLIC_PREFIX = 'campaign.public.';
export const CAMPAIGN_SETTINGS_KEY = 'campaign.selection';
export const THEME_TOKENS = Object.freeze(['background','surface','text','mutedText','primary','primaryText','secondary','secondaryText','link','border','focus','brandRed','brandBlue']);
const GROUPS = {
 global: {branding:['slogan','footerMotto']},
 home: {
  hero:['eyebrow','headline','body','primaryLabel','secondaryLabel','footnote'],
  promise:['heading','freedomLabel','repairLabel','opportunityLabel'],
  philosophy:['eyebrow','headline','lead','body1','body2','callout'],
  issues:['eyebrow','headline','linkLabel','footnote'],
  story:['eyebrow','headline','body1','body2','quote','linkLabel'],
  join:['eyebrow','headline','body','buttonLabel'],donate:['eyebrow','headline','body']
 },
 issues:{intro:['eyebrow','headline','body'],freedom:['tagline','summary','buttonLabel'],repair:['tagline','summary','buttonLabel'],opportunity:['tagline','summary','buttonLabel']},
 'issue-freedom':{intro:['eyebrow','headline','body']},
 'issue-repair':{intro:['eyebrow','headline','body']},
 'issue-opportunity':{intro:['eyebrow','headline','body']},
 volunteer:{hero:['eyebrow','headline','body','primaryLabel','secondaryLabel'],join:['eyebrow','headline']},
 donate:{intro:['eyebrow','headline','body']}
};
for(const page of Object.keys(GROUPS)) if(page!=='global') GROUPS[page].metadata=['title','description'];
export const CAMPAIGN_FIELDS = Object.freeze(Object.entries(GROUPS).flatMap(([page,sections])=>Object.entries(sections).flatMap(([section,names])=>names.map(name=>Object.freeze({key:`${page}.${section}.${name}`,page,section,label:name,maxLength:name==='title'?180:name==='description'?500:name.endsWith('Label')?160:6000})))));
const FIELD_MAP=new Map(CAMPAIGN_FIELDS.map(field=>[field.key,field]));
export class CampaignError extends Error {
 constructor(code,message,statusCode=400){super(message);this.name='CampaignError';this.code=code;this.statusCode=statusCode;}
}
export function campaignFailure(code,message,status=400){throw new CampaignError(code,message,status);}
export function exactCampaignKeys(value,allowed,label='record'){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))) campaignFailure('invalid_object',`Invalid ${label}.`);
 if(Object.getOwnPropertySymbols(value).length||Object.keys(value).some(key=>!allowed.includes(key)||['__proto__','prototype','constructor'].includes(key))) campaignFailure('unknown_field',`Unsupported field in ${label}.`);
 return value;
}
function text(value,limit,label){
 if(typeof value!=='string'||!value.trim()||value.length>limit||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) campaignFailure('invalid_text',`Invalid ${label}.`);
 return value;
}
export function campaignId(value){
 if(typeof value!=='string'||value.length!==36||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) campaignFailure('invalid_campaign_id','Invalid campaign identifier.');
 return value.toLowerCase();
}
export function revisionNumber(value){
 if(!Number.isSafeInteger(value)||value<1) campaignFailure('invalid_revision','Invalid revision.');
 return value;
}
export function validateEditorialName(value){
 text(value,160,'editorial name');
 if(/[\r\n]/.test(value)) campaignFailure('invalid_name','Editorial names must be on one line.');
 return value.trim();
}
function color(value){
 if(typeof value!=='string'||value.length!==7||!/^#[0-9a-f]{6}$/i.test(value)) campaignFailure('invalid_color','Colors must use six-digit hexadecimal values.');
 return value.toUpperCase();
}
function luminance(value){
 const hex=color(value).slice(1);
 const channels=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
 return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
}
export function contrastRatio(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
export function contrastProblems(theme){
 return [['text','background',4.5],['text','surface',4.5],['mutedText','background',4.5],['mutedText','surface',4.5],['link','background',4.5],['link','surface',4.5],['primaryText','primary',4.5],['secondaryText','secondary',4.5],['focus','background',3],['focus','surface',3]].map(([foreground,background,minimum])=>({foreground,background,minimum,ratio:contrastRatio(theme[foreground],theme[background])})).filter(x=>x.ratio<x.minimum);
}
export function validateTheme(value,{publishing=false}={}){
 exactCampaignKeys(value,THEME_TOKENS,'theme');
 const normalized=Object.fromEntries(THEME_TOKENS.map(key=>[key,color(value[key])]));
 if(publishing&&contrastProblems(normalized).length) campaignFailure('insufficient_contrast','Theme has inaccessible text or focus color pairs.');
 return normalized;
}
export function validateHero(value){
 const keys=['assetPath','alt','focalX','focalY','mobileFocalX','mobileFocalY'];
 exactCampaignKeys(value,keys,'hero');
 if(typeof value.assetPath!=='string'||value.assetPath.length>256||value.assetPath!==value.assetPath.trim()||!/^\/(?:assets|campaign-media)\/[A-Za-z0-9_/-]+\.(?:webp|png|jpg|jpeg|avif)$/.test(value.assetPath)||value.assetPath.includes('//')) campaignFailure('invalid_asset','Choose an approved same-origin raster image.');
 const result={assetPath:value.assetPath,alt:text(value.alt,500,'image description')};
 for(const key of keys.slice(2)){
  if(typeof value[key]!=='number'||!Number.isFinite(value[key])||value[key]<0||value[key]>100) campaignFailure('invalid_focal_point','Image focal positions must be between 0 and 100.');
  result[key]=value[key];
 }
 return result;
}

export const HERO_EFFECT_PRESETS=Object.freeze([
 Object.freeze({id:'none',label:'Clean'}),
 Object.freeze({id:'clouds',label:'Ethereal Cloud Drift'}),
 Object.freeze({id:'aurora',label:'Soft Aurora Veil'}),
 Object.freeze({id:'halo',label:'Radial Glow Halo'}),
 Object.freeze({id:'silk',label:'Silk Wave'}),
 Object.freeze({id:'beams',label:'Atmospheric Grain + Light Beams'}),
 Object.freeze({id:'geometry',label:'Geometric Glow Field'}),
 Object.freeze({id:'legacy',label:'Particle Field (Legacy)'})
]);
export const HERO_EFFECT_SPEEDS=Object.freeze(['still','slow','medium']);
export const HERO_EFFECT_DEFAULT=Object.freeze({
 preset:'aurora',animated:true,intensity:55,opacity:58,blur:56,speed:'slow'
});
export function validateHeroEffect(value){
 const keys=['preset','animated','intensity','opacity','blur','speed'];
 exactCampaignKeys(value,keys,'hero background effect');
 if(!HERO_EFFECT_PRESETS.some(entry=>entry.id===value.preset))campaignFailure('invalid_hero_effect','Choose a supported background preset.');
 if(typeof value.animated!=='boolean')campaignFailure('invalid_hero_animation','Animation must be enabled or disabled.');
 if(!HERO_EFFECT_SPEEDS.includes(value.speed))campaignFailure('invalid_hero_speed','Choose an allowed background speed.');
 const checked={preset:value.preset,animated:value.animated,speed:value.speed};
 for(const key of ['intensity','opacity','blur']){
  if(!Number.isInteger(value[key])||value[key]<0||value[key]>100)campaignFailure('invalid_hero_parameter',`Hero background ${key} must be between 0 and 100.`);
  checked[key]=value[key];
 }
 return checked;
}
export function validateHeroBackground(value){
 exactCampaignKeys(value,['default','day','night'],'hero background');
 const basic={default:validateHeroEffect(value.default)};
 for(const mode of ['day','night'])basic[mode]=value[mode]==null?null:validateHeroEffect(value[mode]);
 return basic;
}
export function resolveHeroBackground(value,mode='default'){
 if(!['default','day','night'].includes(mode))campaignFailure('invalid_hero_mode','Unsupported background appearance mode.');
 if(value===undefined)return{...HERO_EFFECT_DEFAULT};
 const backgrounds=validateHeroBackground(value);
 return{...(backgrounds[mode]??backgrounds.default)};
}

export function validateCampaignDocument(value,{publishing=false}={}){
 exactCampaignKeys(value,['schemaVersion','internalName','fields','theme','hero','heroBackground'],'campaign document');
 if(value.schemaVersion!==1) campaignFailure('unknown_schema','Unsupported campaign content version.');
 const internalName=validateEditorialName(value.internalName);
 exactCampaignKeys(value.fields,[...FIELD_MAP.keys()],'text fields');
 const fields=Object.fromEntries(Object.entries(value.fields).map(([key,valueText])=>[key,text(valueText,FIELD_MAP.get(key).maxLength,'campaign text')]));
 if(publishing&&CAMPAIGN_FIELDS.some(field=>!Object.hasOwn(fields,field.key))) campaignFailure('missing_content','Complete every required campaign field before publication.');
 return{schemaVersion:1,internalName,fields,theme:validateTheme(value.theme,{publishing}),hero:validateHero(value.hero),...(value.heroBackground===undefined?{}:{heroBackground:validateHeroBackground(value.heroBackground)})};
}
export function publicCampaignDocument(value){const{schemaVersion,fields,theme,hero,heroBackground}=validateCampaignDocument(value,{publishing:true});return{schemaVersion,fields,theme,hero,...(heroBackground===undefined?{}:{heroBackground})};}
export function validatePublicCampaignDocument(value){
 exactCampaignKeys(value,['schemaVersion','fields','theme','hero','heroBackground'],'published campaign');
 return publicCampaignDocument({...value,internalName:'Published content'});
}
export function compareCampaignDocuments(left,right,{filter='all'}={}){
 if(!['all','changed','identical','missing'].includes(filter)) campaignFailure('invalid_filter','Unsupported comparison filter.');
 const a=validateCampaignDocument(left),b=validateCampaignDocument(right);
 return CAMPAIGN_FIELDS.map(field=>{const x=a.fields[field.key]??null,y=b.fields[field.key]??null;return{...field,left:x,right:y,state:x===null||y===null?'missing':x===y?'identical':'changed'};}).filter(row=>filter==='all'||row.state===filter);
}
function selection(value){exactCampaignKeys(value,['campaignId','revision'],'release selection');return{campaignId:campaignId(value.campaignId),revision:revisionNumber(value.revision)};}
export function validateCampaignSettings(value){
 exactCampaignKeys(value,['schemaVersion','modeSwitching','default','day','night'],'campaign settings');
 if(value.schemaVersion!==1||typeof value.modeSwitching!=='boolean') campaignFailure('invalid_settings','Invalid campaign settings.');
 const result={schemaVersion:1,modeSwitching:value.modeSwitching,default:selection(value.default),day:value.day==null?null:selection(value.day),night:value.night==null?null:selection(value.night)};
 if(result.modeSwitching&&(!result.day||!result.night)) campaignFailure('missing_mode_assignment','Assign published day and night campaigns before enabling modes.');
 return result;
}
export function resolveCampaignSelection(value,{preference='system',systemMode=null}={}){
 const s=validateCampaignSettings(value);if(!s.modeSwitching)return{...s.default,mode:'default'};
 const choice=['day','night'].includes(preference)?preference:'system';const mode=choice==='system'?(systemMode==='night'?'night':'day'):choice;
 return{...s[mode],mode};
}
export function escapeCampaignText(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function renderCampaignText(document,key,{lineBreaks=false}={}){
 if(!FIELD_MAP.has(key)||!Object.hasOwn(document.fields,key)) campaignFailure('missing_content','Campaign text is unavailable.',503);
 const encoded=escapeCampaignText(document.fields[key]);return lineBreaks?encoded.replace(/\r?\n/g,'<br>'):encoded;
}
export function campaignThemeCss(theme){const normalized=validateTheme(theme,{publishing:true});return':root{'+THEME_TOKENS.map(key=>'--campaign-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+normalized[key]+';').join('')+'}';}

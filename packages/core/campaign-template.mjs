import {CAMPAIGN_FIELDS,validatePublicCampaignDocument,escapeCampaignText,campaignThemeCss,campaignFailure,contrastRatio} from './campaign-content.mjs';
import {heroBackdropMarkup,heroEffectNeedsScript,HERO_EFFECT_CSS_PATH,HERO_EFFECT_SCRIPT_PATH} from './campaign-hero-effects.mjs';
const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
export const CAMPAIGN_PAGE_KEYS=Object.freeze({index:'home',issues:'issues','kirk-evers':'issue-freedom',garden:'issue-repair',cornerstone:'issue-opportunity',volunteer:'volunteer',donate:'donate',notices:'notices'});
// Index trusted, checked-in renderer output only. This is NOT an HTML sanitizer.
// Editorial values never enter the indexer; they are escaped into precomputed slots.
export function indexTrustedHtml(html){
 if(typeof html!=='string'||html.length>2000000)throw Error('Invalid template size.');
 const nodes=[],stack=[];let position=0;
 while(position<html.length){
  const start=html.indexOf('<',position);if(start<0)break;
  if(html.startsWith('<!--',start)){const end=html.indexOf('-->',start+4);if(end<0)throw Error('Unclosed template comment.');position=end+3;continue;}
  let end=start+1,quote=null;
  for(;end<html.length;end++){const c=html[end];if(quote){if(c===quote)quote=null;}else if(c==='"'||c==="'")quote=c;else if(c==='>')break;}
  if(end===html.length)throw Error('Unclosed template tag.');
  const token=html.slice(start,end+1),match=/^<(\/)?([a-z][a-z0-9:-]*)\b/i.exec(token);position=end+1;if(!match)continue;
  const tag=match[2].toLowerCase();
  if(match[1]){const node=stack.pop();if(!node||node.tag!==tag)throw Error('Unbalanced trusted template.');node.closeStart=start;node.end=end+1;continue;}
  const attrs={};const re=/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;re.lastIndex=match[0].length;let a;
  while((a=re.exec(token))&&a.index<token.length-1){
   const key=a[1].toLowerCase(),value=a[2]??a[3]??a[4]??'';if(key==='/')continue;
   const equal=a[0].indexOf('=');let valueStart=null,valueEnd=null;
   if(equal>=0){const tail=a[0].slice(equal+1),space=tail.length-tail.trimStart().length;valueStart=start+a.index+equal+1+space;if(html[valueStart]==='"'||html[valueStart]==="'")valueStart++;valueEnd=valueStart+value.length;}
   attrs[key]={value,start:valueStart,end:valueEnd};
  }
  const node={tag,attrs,start,openEnd:end+1,closeStart:null,end:null,parent:stack.at(-1)||null};nodes.push(node);
  if(VOID.has(tag)||/\/\s*>$/.test(token)){node.closeStart=end+1;node.end=end+1;continue;}
  stack.push(node);
  if(tag==='script'||tag==='style'){const close=new RegExp('</'+tag+'\\s*>','ig');close.lastIndex=position;const found=close.exec(html);if(!found)throw Error('Unclosed raw-text template tag.');position=found.index;}
 }
 if(stack.length)throw Error('Unclosed trusted template element.');
 return nodes;
}
function simple(node,selector){
 const tag=/^[a-z][a-z0-9-]*/i.exec(selector)?.[0];if(tag&&node.tag!==tag.toLowerCase())return false;
 const id=/#([A-Za-z0-9_-]+)/.exec(selector)?.[1];if(id&&node.attrs.id?.value!==id)return false;
 for(const item of selector.matchAll(/\.([A-Za-z0-9_-]+)/g))if(!node.attrs.class?.value.split(/\s+/).includes(item[1]))return false;
 for(const item of selector.matchAll(/\[([\w:-]+)="([^"]*)"\]/g))if(node.attrs[item[1]]?.value!==item[2])return false;
 return true;
}
function select(nodes,selector){
 const parts=selector.split(/\s+/);return nodes.filter(node=>{
  let i=parts.length-1,current=node;if(!simple(current,parts[i--]))return false;
  while(i>=0){current=current.parent;while(current&&!simple(current,parts[i]))current=current.parent;if(!current)return false;i--;}
  return true;
 });
}
export function compileCampaignTemplate(html,routeKey){
 const page=CAMPAIGN_PAGE_KEYS[routeKey];if(!page)throw Error('Unknown campaign template route.');
 const nodes=indexTrustedHtml(html),slots=[];
 const find=(selector,index=null)=>{const found=select(nodes,selector);if(index==null&&found.length!==1||index!=null&&!found[index])throw Error('Template slot unavailable: '+page+' '+selector);return found[index??0];};
 const add=(selector,key,{index=null,decoration='plain',part='inner',attribute=null}={})=>{
  const node=find(selector,index);let start=node.openEnd,end=node.closeStart;
  if(attribute){const a=node.attrs[attribute];if(a?.start==null)throw Error('Template attribute unavailable.');start=a.start;end=a.end;}
  if(part==='prefix'){const first=nodes.find(n=>n.parent===node);if(first)end=first.start;}
  slots.push({key,start,end,decoration:attribute?'attribute':decoration});
 };
 add('.topline','global.branding.slogan',{part:'prefix'});
 add('.footer-bottom span','global.branding.footerMotto',{index:0});
 if(page!=='notices'){
  add('title',page+'.metadata.title');
  add('meta[name="description"]',page+'.metadata.description',{attribute:'content'});
  add('meta[property="og:title"]',page+'.metadata.title',{attribute:'content'});
  add('meta[property="og:description"]',page+'.metadata.description',{attribute:'content'});
 }
 if(page==='home'){
  add('.hero-copy .eyebrow','home.hero.eyebrow');add('.hero-copy h1','home.hero.headline',{decoration:'headline'});add('.hero-copy p','home.hero.body');
  add('.hero-copy .actions a','home.hero.primaryLabel',{index:0,decoration:'arrow'});add('.hero-copy .actions a','home.hero.secondaryLabel',{index:1,decoration:'arrow'});add('.hero-foot','home.hero.footnote');
  add('.promise-strip h3','home.promise.heading');for(const [i,key]of ['freedomLabel','repairLabel','opportunityLabel'].entries())add('.promise-items a','home.promise.'+key,{index:i});
  add('.philosophy .eyebrow','home.philosophy.eyebrow');add('.philosophy h2','home.philosophy.headline');for(const [i,key]of ['lead','body1','body2'].entries())add('.philosophy p','home.philosophy.'+key,{index:i});add('.philosophy .debt-callout','home.philosophy.callout');
  add('.section-head .eyebrow','home.issues.eyebrow');add('.section-head h2','home.issues.headline');add('.section-head a','home.issues.linkLabel',{decoration:'arrow'});add('.section.soft p.small','home.issues.footnote');
  for(const [i,key]of ['freedom','repair','opportunity'].entries())add('.issue-card-body p','issues.'+key+'.summary',{index:i});
  add('.story-copy .eyebrow','home.story.eyebrow');add('.story-copy h2','home.story.headline');add('.story-copy p','home.story.body1',{index:0});add('.story-copy p','home.story.body2',{index:1});add('.story-quote','home.story.quote',{decoration:'quote'});add('.story-copy a','home.story.linkLabel',{decoration:'arrow'});
  add('.join-banner .eyebrow','home.join.eyebrow');add('.join-banner h2','home.join.headline');add('.join-banner p','home.join.body');add('.join-banner a','home.join.buttonLabel',{decoration:'arrow'});
  add('.donation-intro .eyebrow','home.donate.eyebrow');add('.donation-intro h2','home.donate.headline',{decoration:'serif-last-line'});add('.donation-intro p','home.donate.body',{index:0});
  add('.hero img.candidate','@heroPath',{attribute:'src'});add('.hero img.candidate','@heroAlt',{attribute:'alt'});
 }else if(page==='issues'){
  add('.page-intro .eyebrow','issues.intro.eyebrow');add('.page-intro h1','issues.intro.headline');add('.page-intro p','issues.intro.body');
  for(const [i,key]of ['freedom','repair','opportunity'].entries()){add('.issue-wide .tagline','issues.'+key+'.tagline',{index:i});add('.issue-wide p','issues.'+key+'.summary',{index:i});add('.issue-wide .actions a','issues.'+key+'.buttonLabel',{index:i,decoration:'arrow'});}
 }else if(page.startsWith('issue-')){
  add('.policy-hero-copy .eyebrow',page+'.intro.eyebrow');add('.policy-hero-copy .tagline',page+'.intro.headline');add('.policy-hero-copy p',page+'.intro.body');
 }else if(page==='volunteer'){
  add('.volunteer-hero .eyebrow','volunteer.hero.eyebrow');add('.volunteer-hero h1','volunteer.hero.headline');add('.volunteer-hero p','volunteer.hero.body',{index:0});add('.volunteer-hero .actions a','volunteer.hero.primaryLabel',{index:0,decoration:'arrow'});add('.volunteer-hero .actions a','volunteer.hero.secondaryLabel',{index:1,decoration:'arrow'});
  add('#join .eyebrow','volunteer.join.eyebrow',{index:0});add('#join h2','volunteer.join.headline');
 }else if(page==='donate'){
  add('.donate-message .eyebrow','donate.intro.eyebrow');add('.donate-message h1','donate.intro.headline');add('.donate-message p','donate.intro.body',{index:0});
 }
 const themeColor=select(nodes,'meta[name="theme-color"]')[0];if(themeColor?.attrs.content)slots.push({key:'@themeColor',start:themeColor.attrs.content.start,end:themeColor.attrs.content.end,decoration:'plain'});
 const ordered=[...slots].sort((a,b)=>a.start-b.start);for(let i=1;i<ordered.length;i++)if(ordered[i].start<ordered[i-1].end)throw Error('Overlapping campaign template slots.');
 const root=find('html'),head=find('head'),header=find('header.header');
 const backdrops=select(nodes,'section.hero canvas.flag-canvas');
 if(page==='home'&&backdrops.length!==1)throw Error('Campaign hero background slot unavailable.');
 const heroBackdrop=backdrops.length?{start:backdrops[0].start,end:backdrops[0].end}:null;
 const csp=select(nodes,'meta[http-equiv="Content-Security-Policy"]')[0]?.attrs.content;
 return{schemaVersion:1,page,routeKey,html,slots,rootInsert:root.openEnd-1,headInsert:head.closeStart,controlInsert:header.closeStart,heroBackdrop,csp:csp?{...csp}:null};
}
function decorated(value,type){
 if(type==='attribute')return escapeCampaignText(value).replace(/\r?\n/g,' ');
 const text=escapeCampaignText(value).replace(/\r?\n/g,'<br>');
 if(type==='arrow')return text+'<span aria-hidden="true">&rarr;</span>';
 if(type==='quote')return '&ldquo;'+text+'&rdquo;';
 if(type==='headline'){const words=text.split(/(\s+|<br>)/);for(let i=words.length-1;i>=0;i--)if(words[i]&&!/^\s+$/.test(words[i])&&words[i]!=='<br>'){words[i]='<span class="red">'+words[i]+'</span>';break;}return words.join('');}
 if(type==='serif-last-line'){const lines=text.split('<br>');lines[lines.length-1]='<span class="serif">'+lines.at(-1)+'</span>';return lines.join('<br>');}
 return text;
}
export function renderCampaignTemplate(template,record,{mode='default',preference='system',modeEnabled=false,settingsVersion=0,path='/',css='',scriptPath='/assets/campaign-mode.js'}={}){
 const document=validatePublicCampaignDocument(record);
 if(template.schemaVersion!==1||!['default','day','night'].includes(mode)||!['system','day','night'].includes(preference)||typeof modeEnabled!=='boolean'||!Number.isSafeInteger(settingsVersion)||settingsVersion<0||path!==path.trim()||!/^\/[A-Za-z0-9/-]*$/.test(path)||scriptPath!=='/assets/campaign-mode.js')campaignFailure('invalid_render_context','Invalid campaign render context.',503);
 const edits=template.slots.map(slot=>{
  let value=slot.key==='@heroPath'?document.hero.assetPath:slot.key==='@heroAlt'?document.hero.alt:slot.key==='@themeColor'?document.theme.background:document.fields[slot.key];
  if(value==null)campaignFailure('missing_content','Published template content is missing.',503);
  return{start:slot.start,end:slot.end,value:decorated(value,slot.decoration)};
 });
 if(template.heroBackdrop){
  edits.push({start:template.heroBackdrop.start,end:template.heroBackdrop.end,value:heroBackdropMarkup(document,mode)});
 }
 const long=document.fields['home.hero.headline'].length>32;
 edits.push({start:template.rootInsert,end:template.rootInsert,value:` data-campaign="true" data-campaign-mode="${mode}" data-campaign-preference="${preference}" data-campaign-mode-enabled="${modeEnabled}" data-campaign-long-heading="${long}"`});
 const accent=contrastRatio(document.theme.primary,document.theme.background)>=4.5&&contrastRatio(document.theme.primary,document.theme.surface)>=4.5?document.theme.primary:document.theme.link;
 const inputBorder=contrastRatio(document.theme.border,document.theme.surface)>=3?document.theme.border:document.theme.mutedText;
 const focal=`:root{--campaign-accent-text:${accent};--campaign-input-border:${inputBorder}}.hero .candidate{aspect-ratio:2/3;object-fit:cover;object-position:${document.hero.focalX}% ${document.hero.focalY}%}@media(max-width:700px){.hero .candidate{object-position:${document.hero.mobileFocalX}% ${document.hero.mobileFocalY}%}}`;
 const heroAssets=template.heroBackdrop?'<link rel="stylesheet" href="'+HERO_EFFECT_CSS_PATH+'">'+
  (heroEffectNeedsScript(document,mode)?'<script defer src="'+HERO_EFFECT_SCRIPT_PATH+'"></script>':''):'';
 edits.push({start:template.headInsert,end:template.headInsert,value:`<style data-campaign-theme>${campaignThemeCss(document.theme)}${css}${focal}</style>${heroAssets}${modeEnabled?'<script src="'+scriptPath+'"></script>':''}`});
 if(modeEnabled&&template.csp){const policy=template.csp.value.replace(/form-action\s+'none'/,"form-action 'self'");edits.push({start:template.csp.start,end:template.csp.end,value:escapeCampaignText(policy)});}
 if(modeEnabled){const options=['system','day','night'].map(value=>`<option value="${value}"${value===preference?' selected':''}>${value[0].toUpperCase()+value.slice(1)}</option>`).join('');edits.push({start:template.controlInsert,end:template.controlInsert,value:`<form class="campaign-appearance" action="${path}" method="get"><label>Appearance <select name="appearance" aria-label="Website appearance">${options}</select></label><button type="submit">Apply</button></form>`});}
 let html=template.html;for(const edit of edits.sort((a,b)=>b.start-a.start))html=html.slice(0,edit.start)+edit.value+html.slice(edit.end);
 return html;
}
export function campaignTemplateCoverage(templates){
 const used=new Set(templates.flatMap(template=>template.slots.map(slot=>slot.key)));return CAMPAIGN_FIELDS.filter(field=>!used.has(field.key)).map(field=>field.key);
}

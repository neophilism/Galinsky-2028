// Opt-in, first-party aggregate engagement. No keystrokes, form values,
// arbitrary DOM text, URLs, referral information, account IDs or mouse trails.
(()=>{
 'use strict';
 const pages=new Set(['/','/issues/','/issues/kirk-evers/','/issues/garden/','/issues/cornerstone/','/policies/eternal-liberty/','/volunteer/','/donate/','/notices/']);
 const path=location.pathname.endsWith('/')?location.pathname:location.pathname+'/';
 if(!pages.has(path)||typeof crypto.randomUUID!=='function')return;
 const KEY='g28-anonymous-analytics-choice-v1';
 const blocked=()=>navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||window.doNotTrack==='1';
 const save=value=>{try{localStorage.setItem(KEY,value);}catch{}};
 const read=()=>{try{return localStorage.getItem(KEY);}catch{return null;}};
 const safeList=selector=>[...document.querySelectorAll(selector)].filter(e=>!e.closest('[data-analytics-ui]')).slice(0,200);
 const position=(el,selector,prefix)=>{
  const found=safeList(selector).indexOf(el);
  return found>=0?prefix+(found+1):null;
 };
 const sections=safeList('main section, main article, main aside');
 const ids=new Map(sections.map((node,index)=>[node,'s'+(index+1)]));
 const accordions=safeList('main details');
 const accordionKeys=new Map(accordions.map((node,index)=>[node,'a'+(index+1)]));
 const mediaNodes=safeList('main video, main audio');
 const mediaKeys=new Map(mediaNodes.map((node,index)=>[node,'m'+(index+1)]));
 const fieldSelector='main input, main select, main textarea';
 const linkSelector='a[href]';
 const buttonSelector='button';
 let active=false,ended=false,viewId='',sequence=0,seconds=0,started=null;
 let pending=[],sendTimer=null,pulseTimer=null,sectionObserver=null;
 let consentPanel=null;
 const observed=new Set(),activeSections=new Map(),formTouched=new Set(),formSubmitted=new Set();
 const scrolled=new Set(),mediaMilestones=new WeakMap(),hoverStarted=new WeakMap();
 const visible=()=>document.visibilityState==='visible'&&document.hasFocus();
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

 function post(payload,beacon=false){
  const data=JSON.stringify(payload);
  if(beacon&&navigator.sendBeacon){
   navigator.sendBeacon('/api/visitor-analytics',new Blob([data],{type:'application/json'}));return;
  }
  fetch('/api/visitor-analytics',{method:'POST',credentials:'same-origin',cache:'no-store',
   keepalive:beacon,headers:{'Content-Type':'application/json'},body:data}).catch(()=>{});
 }
 function enqueue(kind,target,detail='none',amount=0){
  if(!active||ended||sequence>=2000||!target)return;
  pending.push({seq:++sequence,kind,target,detail,amount});
  if(pending.length>=12)flush();
  else if(!sendTimer)sendTimer=setTimeout(flush,1500);
 }
 function flush(beacon=false){
  if(sendTimer){clearTimeout(sendTimer);sendTimer=null;}
  if(!pending.length)return;
  while(pending.length){
   const events=pending.splice(0,12);
   post({path,viewId,events},beacon);
  }
 }
 const settlePage=()=>{if(started!==null){seconds+=Math.max(0,(performance.now()-started)/1000);started=null;}};
 const pageEvent=(action,beacon=false)=>post({action,path,viewId,seconds:Math.min(14400,Math.floor(seconds))},beacon);
 const targetSection=el=>{
  for(const [node,key] of ids)if(node===el||node.contains(el))return key;
  return ids.values().next().value||'s1';
 };
 function settleSections(resume=false){
  const now=performance.now();
  for(const [key,at]of activeSections){
   const length=clamp(Math.floor((now-at)/1000),0,60);
   if(length>0)enqueue('section_time',key,'none',length);
   activeSections.delete(key);
  }
  if(resume&&visible()){
   for(const node of observed){
    const rect=node.getBoundingClientRect();
    const inView=Math.max(0,Math.min(innerHeight,rect.bottom)-Math.max(0,rect.top));
    if(rect.height>0&&inView/Math.min(rect.height,innerHeight)>=0.5){
     const key=ids.get(node);
     if(key)activeSections.set(key,now);
    }
   }
  }
 }
 function sectionChanges(entries){
  if(!active||ended)return;
  for(const entry of entries){
   const key=ids.get(entry.target);
   if(!key)continue;
   const occupied=entry.intersectionRect.height/Math.max(1,Math.min(entry.boundingClientRect.height,innerHeight));
   const isReading=occupied>=0.5&&visible();
   if(isReading&&!activeSections.has(key)){
    activeSections.set(key,performance.now());enqueue('section_enter',key);
   }else if(!isReading&&activeSections.has(key)){
    const at=activeSections.get(key);
    const length=clamp(Math.floor((performance.now()-at)/1000),0,60);
    if(length>0)enqueue('section_time',key,'none',length);
    activeSections.delete(key);
   }
  }
 }
 function sampleDepth(){
  if(!active||ended||!visible())return;
  const doc=document.documentElement,full=Math.max(1,doc.scrollHeight);
  const progress=clamp((window.scrollY+innerHeight)/full,0,1);
  for(const mark of [10,25,50,75,90,100]){
   if(progress>=mark/100&&!scrolled.has(mark)){
    scrolled.add(mark);enqueue('scroll_depth','p0','d'+mark);
   }
  }
 }
 function destination(link){
  try{
   const raw=link.getAttribute('href')||'';
   if(raw.startsWith('#'))return 'anchor';
   const u=new URL(raw,location.href);
   if(u.origin!==location.origin){
    if(u.pathname.startsWith('/roles')||u.pathname.startsWith('/join'))return 'portal';
    return 'external';
   }
   if(u.pathname.includes('/download/'))return 'document';
   const normalized=u.pathname.endsWith('/')?u.pathname:u.pathname+'/';
   return ({'/':'home','/issues/':'issues','/issues/kirk-evers/':'kirk-evers',
    '/issues/garden/':'garden','/issues/cornerstone/':'cornerstone','/volunteer/':'volunteer',
    '/donate/':'donate','/notices/':'notices','/policies/eternal-liberty/':'eternal-liberty'})[normalized]||'other';
  }catch{return 'other';}
 }
 function onClick(event){
  if(!active||ended||!event.target?.closest||event.target.closest('[data-analytics-ui]'))return;
  const point=event.target;
  if(point.closest('main')&&event.detail!==0){
   const full=Math.max(1,document.documentElement.scrollHeight);
   const x=clamp(Math.floor(event.clientX/Math.max(1,innerWidth)*20),0,19);
   const y=clamp(Math.floor((window.scrollY+event.clientY)/full*20),0,19);
   enqueue('click_heatmap','p0','none',y*20+x);
  }
  const link=point.closest('a[href]');
  if(link){
   const key=position(link,linkSelector,'l');
   const where=destination(link);
   enqueue('link_click',key,where);
   if(link.hasAttribute('download')||where==='document')enqueue('download',key,'document');
   return;
  }
  const button=point.closest('button');
  if(button){
   const key=position(button,buttonSelector,'b');
   enqueue('button_click',key);
   if(button.hasAttribute('data-share-action'))enqueue('share',key);
  }
 }
 function onToggle(event){
  if(!active||ended||event.target.tagName!=='DETAILS')return;
  const key=accordionKeys.get(event.target);
  enqueue(event.target.open?'accordion_open':'accordion_close',key);
 }
 function onFocus(event){
  if(!active||ended||!event.target?.matches?.(fieldSelector))return;
  const key=position(event.target,fieldSelector,'f');
  enqueue('field_focus',key);
  const form=event.target.closest('form');
  if(form)formTouched.add(form);
 }
 function onChange(event){
  if(!active||ended||!event.target?.matches?.(fieldSelector))return;
  enqueue('field_change',position(event.target,fieldSelector,'f'));
 }
 function onInvalid(event){
  if(!active||ended||!event.target?.matches?.(fieldSelector))return;
  enqueue('field_invalid',position(event.target,fieldSelector,'f'));
 }
 function onSubmit(event){
  if(!active||ended||event.target.tagName!=='FORM')return;
  formSubmitted.add(event.target);
  enqueue('form_submit',position(event.target,'main form','f'));
 }
 function onCopy(event){
  if(active&&!ended&&event.target?.closest?.('main'))enqueue('copy',targetSection(event.target));
 }
 function onPointerOver(event){
  if(!active||ended||event.pointerType==='touch')return;
  const link=event.target?.closest?.('a[href]');
  if(link&&!link.closest('[data-analytics-ui]')&&!hoverStarted.has(link))hoverStarted.set(link,performance.now());
 }
 function onPointerOut(event){
  if(!active||ended||event.pointerType==='touch')return;
  const link=event.target?.closest?.('a[href]');
  const at=link&&hoverStarted.get(link);
  if(at===undefined||link.contains(event.relatedTarget))return;
  hoverStarted.delete(link);
  const duration=clamp(Math.ceil((performance.now()-at)/1000),0,300);
  if(duration>=1)enqueue('hover_time',position(link,linkSelector,'l'),'none',duration);
 }
 function onMedia(event){
  if(!active||ended)return;
  const media=event.target,key=mediaKeys.get(media);
  if(!key)return;
  const map={play:'media_play',pause:'media_pause',ended:'media_end',seeked:'media_seek'};
  if(map[event.type]){
   const current=event.type==='seeked'?clamp(Math.floor(media.currentTime||0),0,14400):0;
   enqueue(map[event.type],key,'none',current);
  }
  if(event.type==='timeupdate'&&Number.isFinite(media.duration)&&media.duration>0){
   let marks=mediaMilestones.get(media);if(!marks){marks=new Set();mediaMilestones.set(media,marks);}
   const percent=100*(media.currentTime/media.duration);
   for(const n of [25,50,75,100])if(percent>=n&&!marks.has(n)){
    marks.add(n);enqueue('media_progress',key,'q'+n);
   }
  }
 }
 function onVisible(){
  if(!active||ended)return;
  if(blocked()){stop();return;}
  if(!visible()){window.dispatchEvent(new Event('g28:analytics-finalize'));settlePage();settleSections();pageEvent('pulse');flush();}
  else{if(started===null)started=performance.now();settleSections(true);sampleDepth();}
 }
 function endPage(){
  if(!active||ended)return;
  window.dispatchEvent(new Event('g28:analytics-finalize'));
  for(const form of formTouched)if(!formSubmitted.has(form))enqueue('form_abandon',position(form,'main form','f'));
  settlePage();settleSections();flush(true);ended=true;pageEvent('end',true);
 }
 function resumePage(){
  if(!active)return;
  viewId=crypto.randomUUID();sequence=0;seconds=0;pending=[];ended=false;
  started=visible()?performance.now():null;
  scrolled.clear();activeSections.clear();formTouched.clear();formSubmitted.clear();
  pageEvent('start');settleSections(true);sampleDepth();
  window.dispatchEvent(new Event('g28:analytics-state'));
 }
 function tick(){
  if(!active||ended||!visible())return;
  settlePage();settleSections(true);pageEvent('pulse');flush();
  started=performance.now();sampleDepth();
 }
 function stop(){
  active=false;ended=true;pending=[];activeSections.clear();observed.clear();
  if(sendTimer)clearTimeout(sendTimer);
  if(pulseTimer)clearInterval(pulseTimer);
  if(sectionObserver)sectionObserver.disconnect();
  sendTimer=null;pulseTimer=null;sectionObserver=null;
  window.dispatchEvent(new Event('g28:analytics-state'));
 }
 function start(){
  if(active||blocked())return;
  active=true;ended=false;viewId=crypto.randomUUID();sequence=0;seconds=0;
  started=visible()?performance.now():null;
  pageEvent('start');
  if('IntersectionObserver' in window){
   sectionObserver=new IntersectionObserver(sectionChanges,{threshold:[0,0.01,0.05,0.1,0.25,0.5,1]});
   for(const node of sections){observed.add(node);sectionObserver.observe(node);}
  }
  sampleDepth();
  pulseTimer=setInterval(tick,15000);
  window.dispatchEvent(new Event('g28:analytics-state'));
 }
 // A deliberately tiny bridge: other first-party scripts cannot inspect IDs or
 // page-visit histories, and the server still validates every emitted enum.
 Object.defineProperty(window,'__g28Analytics',{value:Object.freeze({
  isActive:()=>active&&!ended,
  emit:(kind,target='p0',detail='none',amount=0)=>enqueue(kind,target,detail,amount)
 }),writable:false,configurable:false});
 document.addEventListener('click',onClick,{capture:true});
 document.addEventListener('toggle',onToggle,{capture:true});
 document.addEventListener('focusin',onFocus);
 document.addEventListener('change',onChange);
 document.addEventListener('invalid',onInvalid,true);
 document.addEventListener('submit',onSubmit,true);
 document.addEventListener('copy',onCopy);
 document.addEventListener('pointerover',onPointerOver,true);
 document.addEventListener('pointerout',onPointerOut,true);
 for(const type of ['play','pause','ended','seeked','timeupdate'])document.addEventListener(type,onMedia,true);
 document.addEventListener('scroll',sampleDepth,{passive:true});
 document.addEventListener('visibilitychange',onVisible);
 window.addEventListener('focus',onVisible);window.addEventListener('blur',onVisible);
 window.addEventListener('pagehide',endPage);
 window.addEventListener('pageshow',e=>{if(e.persisted)resumePage();});
 window.addEventListener('storage',event=>{
  if(event.key!==KEY)return;
  if(event.newValue==='yes'&&!blocked())start();
  else stop();
  updatePreferenceLabel();
 });

 function updatePreferenceLabel(){
  const label=document.getElementById('analytics-preferences-status');
  if(label)label.textContent=blocked()?'Browser privacy preference prevents anonymous analytics.':
   read()==='yes'?'Anonymous analytics: enabled.':'Anonymous analytics: off.';
 }
 function choose(value){
  save(value);
  if(consentPanel){consentPanel.remove();consentPanel=null;}
  if(value==='yes'&&!blocked())start();else stop();
  updatePreferenceLabel();
 }
 function banner(){
  if(consentPanel||blocked())return;
  const panel=document.createElement('aside');panel.className='analytics-choice';
  panel.setAttribute('data-analytics-ui','');
  panel.setAttribute('aria-label','Anonymous website analytics preference');
  const text=document.createElement('p');
  text.textContent='Help improve the campaign website? Allow anonymous measurements of clicks, scrolling, section time, playback, site errors and performance. No typed content, identity or cross-page tracking.';
  const link=document.createElement('a');link.href='/notices/#privacy';link.textContent=' Privacy details';
  text.append(link);
  const actions=document.createElement('div');actions.className='analytics-choice-actions';
  const yes=document.createElement('button');yes.type='button';yes.textContent='Allow anonymous analytics';
  yes.addEventListener('click',()=>choose('yes'));
  const no=document.createElement('button');no.type='button';no.textContent='No thanks';
  no.addEventListener('click',()=>choose('no'));
  actions.append(yes,no);panel.append(text,actions);document.body.append(panel);consentPanel=panel;
 }
 const preferenceButton=document.getElementById('analytics-preferences-button');
 preferenceButton?.addEventListener('click',()=>{
  if(read()==='yes')choose('no');else banner();
 });
 updatePreferenceLabel();
 if(!blocked()){
  const value=read();
  if(value==='yes')start();else if(value!=='no')banner();
 }
})();

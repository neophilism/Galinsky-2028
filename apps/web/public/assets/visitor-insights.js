// Consent-scoped, aggregate-only experience measurements. No identifiers,
// text inputs, raw URLs, referrers, error messages, stacks or pointer histories.
(()=>{
 'use strict';
 const analytics=()=>window.__g28Analytics;
 const active=()=>analytics()?.isActive?.()===true;
 const emit=(kind,target='p0',detail='none',amount=0)=>{
  if(active())analytics().emit(kind,target,detail,amount);
 };
 const path=location.pathname;
 const limit=(n,min,max)=>Math.max(min,Math.min(max,n));
 const ordinalSection=element=>{
  const sections=[...document.querySelectorAll('main section, main article, main aside')].slice(0,200);
  const match=element?.closest?.('main section, main article, main aside');
  const index=sections.indexOf(match);
  return 's'+(index<0?1:index+1);
 };
 let running=false,observers=[],intervals=[],timeouts=[],lastScroll=null;
 let lastMovement='',lastVelocity='',recentClicks=[],lastRage=-Infinity,mutations=0;
 let observedPerformance=new Map(),vitalsFlushed=false,resourceCount=0;
 let stageSeen=new Set(),pendingNavigation=null,videoSessions=new Set();
 const perfKinds=new Set(['perf_ttfb','perf_fcp','perf_lcp','perf_cls','perf_interaction_delay']);
 const performanceValue=(kind,amount)=>{
  const ms=limit(Math.round(amount),1,14400);
  if(!Number.isFinite(amount)||amount<=0)return;
  observedPerformance.set(kind,ms);
 };
 const metricOnce=(kind,amount)=>{
  if(!Number.isFinite(amount)||amount<=0)return;
  emit(kind,'p0','none',limit(Math.round(amount),1,14400));
 };
 function stages(step){
  if(!stageSeen.has(step)){
   stageSeen.add(step);emit('funnel_step','p0',step);
  }
 }
 function enterFunnel(){
  if(path==='/')stages('home_view');
  else if(path==='/donate/')stages('donate_view');
  else if(path==='/volunteer/')stages('volunteer_view');
  else if(path==='/issues/')stages('issues_view');
  else if(path.startsWith('/issues/')||path.startsWith('/policies/'))stages('policy_view');
 }
 function classifyResource(type){
  return ({img:'image',image:'image',script:'script',link:'style',css:'style',
   font:'font',video:'media',audio:'media'}[type]||'other');
 }
 function resourceError(event){
  if(!running||!active())return;
  if(event.target===window){
   emit('javascript_error');return;
  }
  const element=event.target;
  const type=element?.tagName?.toLowerCase?.()||'other';
  const category=classifyResource(type);
  emit('resource_error','p0',category);
 }
 function rejected(){
  if(running&&active())emit('promise_rejection');
 }
 function monitorObserver(type,callback){
  if(!('PerformanceObserver' in window))return;
  if(!PerformanceObserver.supportedEntryTypes?.includes(type))return;
  try{
   const obs=new PerformanceObserver(list=>{
    if(running&&active())for(const entry of list.getEntries())callback(entry);
   });
   obs.observe({type,buffered:true});
   observers.push(obs);
  }catch{}
 }
 function setupPerformance(){
  const navigation=performance.getEntriesByType?.('navigation')?.[0];
  if(navigation){
   const ttfb=navigation.responseStart-navigation.requestStart;
   performanceValue('perf_ttfb',ttfb);
   const responseStatus=Number(navigation.responseStatus);
   if(responseStatus>=400&&responseStatus<600)
    emit('navigation_http_error','p0',responseStatus<500?'http4':'http5');
  }
  const first=performance.getEntriesByName?.('first-contentful-paint')?.[0];
  if(first)performanceValue('perf_fcp',first.startTime);
  monitorObserver('paint',entry=>{
   if(entry.name==='first-contentful-paint')performanceValue('perf_fcp',entry.startTime);
  });
  monitorObserver('largest-contentful-paint',entry=>{
   performanceValue('perf_lcp',entry.startTime);
  });
  let cls=0;
  monitorObserver('layout-shift',entry=>{
   if(!entry.hadRecentInput){
    cls+=entry.value;
    if(cls>0)performanceValue('perf_cls',cls*1000);
   }
  });
  let worst=0;
  monitorObserver('event',entry=>{
   if(entry.interactionId>0&&entry.duration>worst){
    worst=entry.duration;performanceValue('perf_interaction_delay',worst);
   }
  });
  let longTasks=0;
  monitorObserver('longtask',entry=>{
   if(++longTasks<=25)metricOnce('perf_longtask',entry.duration);
  });
  monitorObserver('resource',entry=>{
   if(entry.duration<2500||++resourceCount>25)return;
   // Only a resource class and rounded elapsed time leave the browser.
   const duration=limit(Math.round(entry.duration),1,14400);
   emit('resource_slow','p0',classifyResource(entry.initiatorType),duration);
  });
 }
 function flushVitals(){
  if(!running||!active()||vitalsFlushed)return;
  vitalsFlushed=true;
  for(const kind of perfKinds){
   const reading=observedPerformance.get(kind);
   if(reading)emit(kind,'p0','none',reading);
  }
 }
 function onScroll(){
  if(!running||!active()||document.hidden)return;
  const at=performance.now(),y=window.scrollY;
  if(lastScroll){
   const elapsed=at-lastScroll.at,delta=y-lastScroll.y;
   if(elapsed>=100&&Math.abs(delta)>=24){
    const direction=delta>0?'down':'up';
    const speed=Math.abs(delta)*1000/Math.max(1,elapsed);
    const level=speed<400?'slow':speed<1600?'medium':'fast';
    if(direction!==lastMovement){emit('scroll_direction','p0',direction);lastMovement=direction;}
    if(level!==lastVelocity){emit('scroll_speed','p0',level);lastVelocity=level;}
    lastScroll={at,y};
   }
  }else lastScroll={at,y};
 }
 function onPointer(event){
  if(!running||!active()||event.detail===0||!event.target?.closest)return;
  if(event.target.closest('[data-analytics-ui]'))return;
  const target=event.target;
  const section=ordinalSection(target);
  const now=performance.now();
  recentClicks=recentClicks.filter(x=>now-x.at<1250);
  recentClicks.push({at:now,section});
  if(recentClicks.filter(x=>x.section===section).length>=3&&now-lastRage>5000){
   emit('rage_click',section);lastRage=now;recentClicks=[];
  }
  const href=target.closest('a[href]');
  if(href){
   let url;
   try{url=new URL(href.getAttribute('href'),location.href);}catch{return;}
   if(url.origin===location.origin&&url.pathname!==location.pathname
     &&!href.hasAttribute('download')&&!event.defaultPrevented){
    emit('navigation_attempt');
    const original=location.href;
    if(pendingNavigation)clearTimeout(pendingNavigation);
    pendingNavigation=setTimeout(()=>{
     if(running&&active()&&location.href===original&&document.visibilityState==='visible')
      emit('navigation_stall');
    },4000);
    timeouts.push(pendingNavigation);
   }
  }
  const interactive=target.closest('a[href],button,summary,input,textarea,select,label,video,audio,[role="button"],[role="link"],[contenteditable],iframe');
  if(!interactive&&target.closest('main')&&!window.getSelection()?.toString()){
   const before=mutations,original=location.href;
   const t=setTimeout(()=>{
    if(running&&active()&&mutations===before&&location.href===original&&document.visibilityState==='visible')
     emit('dead_click',section);
   },750);
   timeouts.push(t);
  }
  if(path==='/'){
   const dest=href?.pathname||'';
   if(dest==='/issues/'||dest.startsWith('/issues/')||dest.startsWith('/policies/'))stages('home_issues');
   if(dest==='/donate/'||target.closest('#donate'))stages('home_donate');
   if(dest==='/volunteer/'||target.closest('#meet-phillip .btn'))stages('home_volunteer');
  }else if(path==='/donate/'){
   if(target.closest('.amount,.other-amount,[data-frequency]'))stages('donate_choice');
   if(target.closest('.donate-continue,[href="/donate/continue"],[href^="/donate/stripe"]'))stages('donate_handoff');
  }else if(path==='/volunteer/'){
   if(target.closest('#find-role,#role-open'))stages('volunteer_role');
   if(href&&/\/roles(?:\/|$)/.test(href.pathname||''))stages('volunteer_handoff');
  }else if(path==='/issues/'&&href){
   const targetHref=href.getAttribute('href')||'';
   if(/^\/issues\/(kirk-evers|garden|cornerstone)\//.test(targetHref))stages('issues_policy');
  }else if(path.startsWith('/issues/')||path.startsWith('/policies/')){
   if(target.closest('.video-play'))stages('policy_media');
  }
 }
 function onChange(event){
  if(!running||!active())return;
  if(path==='/volunteer/'&&event.target?.matches?.('#role-time,#role-pref,#role-training'))
   stages('volunteer_role');
  if(path==='/donate/'&&event.target?.matches?.('.other-amount,[data-frequency]'))
   stages('donate_choice');
 }
 // The YouTube API script is loaded only after *both* separate actions:
 // analytics opt-in and explicit click to play the third-party video.
 let playerApiPromise=null;
 function youtubeAPI(){
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(playerApiPromise)return playerApiPromise;
  playerApiPromise=new Promise((resolve,reject)=>{
   const prior=window.onYouTubeIframeAPIReady;
   const script=document.createElement('script');
   script.src='https://www.youtube.com/iframe_api';
   script.async=true;
   const timeout=setTimeout(()=>reject(Error('YouTube API not available')),10000);
   timeouts.push(timeout);
   window.onYouTubeIframeAPIReady=()=>{
    clearTimeout(timeout);
    if(typeof prior==='function')prior();
    if(window.YT?.Player)resolve(window.YT);
    else reject(Error('YouTube API missing'));
   };
   script.onerror=()=>{clearTimeout(timeout);reject(Error('YouTube API load error'));};
   document.head.append(script);
  });
  return playerApiPromise;
 }
 function youtubeMounted(event){
  if(!running||!active())return;
  const iframe=event.detail?.iframe;
  if(!(iframe instanceof HTMLIFrameElement)||!iframe.isConnected)return;
  let host;
  try{host=new URL(iframe.src);}catch{return;}
  if(host.hostname!=='www.youtube-nocookie.com'||!host.pathname.startsWith('/embed/')||
     host.searchParams.get('enablejsapi')!=='1')return;
  const media=[...document.querySelectorAll('[data-video]')].slice(0,200);
  const box=iframe.closest('[data-video]');
  const index=Math.max(0,media.indexOf(box));
  const target='m'+(index+1),session={iframe,target,timer:null,marked:new Set(),state:null};
  videoSessions.add(session);
  youtubeAPI().then(YT=>{
   if(!running||!active()||!iframe.isConnected)return;
   const reportProgress=()=>{
    if(!running||!active()||!iframe.isConnected){
     if(session.timer)clearInterval(session.timer);
     videoSessions.delete(session);return;
    }
    const player=session.player;
    if(!player||typeof player.getDuration!=='function')return;
    const dur=Number(player.getDuration()),position=Number(player.getCurrentTime());
    if(!Number.isFinite(dur)||dur<=0||!Number.isFinite(position))return;
    const percent=100*position/dur;
    for(const mark of [25,50,75,100]){
     if(percent>=mark&&!session.marked.has(mark)){
      session.marked.add(mark);emit('youtube_progress',target,'q'+mark);
     }
    }
   };
   session.player=new YT.Player(iframe,{events:{
    onReady:()=>{
     if(!running||!active())return;
     session.timer=setInterval(reportProgress,1500);intervals.push(session.timer);
     if(session.player?.getPlayerState?.()===1){
      emit('youtube_play',target);session.state=1;
     }
    },
    onStateChange:e=>{
     if(!running||!active())return;
     if(e.data===session.state)return;
     session.state=e.data;
     if(e.data===1)emit('youtube_play',target);
     else if(e.data===2)emit('youtube_pause',target);
     else if(e.data===0){reportProgress();emit('youtube_end',target);}
    },
    onError:()=>emit('youtube_error',target)
   }});
  }).catch(()=>{if(running&&active())emit('youtube_error',target);});
 }
 function youtubeDisconnected(event){
  const iframe=event.detail?.iframe;
  for(const session of videoSessions){
   if(session.iframe!==iframe)continue;
   if(session.timer)clearInterval(session.timer);
   videoSessions.delete(session);
  }
 }
 const onError=event=>resourceError(event);
 const onPromise=()=>rejected();
 const onMutation=()=>{mutations++;};
 let mutationObserver=null;
 function stop(){
  running=false;
  for(const observer of observers)observer.disconnect();
  observers=[];if(mutationObserver)mutationObserver.disconnect();
  mutationObserver=null;
  for(const interval of intervals)clearInterval(interval);
  intervals=[];
  for(const timeout of timeouts)clearTimeout(timeout);
  timeouts=[];
  for(const session of videoSessions)if(session.timer)clearInterval(session.timer);
  videoSessions.clear();
  if(pendingNavigation)clearTimeout(pendingNavigation);
  pendingNavigation=null;
  document.removeEventListener('click',onPointer,true);
  document.removeEventListener('change',onChange);
  document.removeEventListener('scroll',onScroll);
  window.removeEventListener('error',onError,true);
  window.removeEventListener('unhandledrejection',onPromise);
 }
 function start(){
  if(!active()||running)return;
  running=true;vitalsFlushed=false;lastScroll=null;lastMovement='';lastVelocity='';
  observedPerformance=new Map();stageSeen=new Set();recentClicks=[];lastRage=-Infinity;mutations=0;resourceCount=0;
  const width=window.innerWidth;
  emit('device_class','p0',width<600?'mobile':width<1024?'tablet':'desktop');
  enterFunnel();
  setupPerformance();
  if('MutationObserver' in window){
   mutationObserver=new MutationObserver(onMutation);
   mutationObserver.observe(document.body,{subtree:true,childList:true,attributes:true});
  }
  document.addEventListener('click',onPointer,true);
  document.addEventListener('change',onChange);
  document.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('error',onError,true);
  window.addEventListener('unhandledrejection',onPromise);
 }
 window.addEventListener('g28:analytics-state',()=>{
  if(running)stop();if(active())start();
 });
 window.addEventListener('g28:analytics-finalize',flushVitals);
 window.addEventListener('g28:youtube-mounted',youtubeMounted);
 window.addEventListener('g28:youtube-disconnected',youtubeDisconnected);
 if(active())start();
})();

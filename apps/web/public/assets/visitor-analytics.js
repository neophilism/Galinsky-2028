(()=>{
 if(navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||window.doNotTrack==='1')return;
 const paths=new Set(['/','/issues/','/issues/kirk-evers/','/issues/garden/','/issues/cornerstone/','/volunteer/','/donate/','/notices/']);
 const path=location.pathname.endsWith('/')?location.pathname:location.pathname+'/';
 if(!paths.has(path)||!crypto.randomUUID)return;
 let viewId=crypto.randomUUID(),seconds=0,started=null,ended=false;
 const visible=()=>document.visibilityState==='visible'&&document.hasFocus();
 const settle=()=>{if(started!==null){seconds+=Math.max(0,(performance.now()-started)/1000);started=null;}};
 function send(action,beacon=false){
  const data=JSON.stringify({action,path,viewId,seconds:Math.min(14400,Math.floor(seconds))});
  if(beacon&&navigator.sendBeacon){navigator.sendBeacon('/api/visitor-analytics',new Blob([data],{type:'application/json'}));return;}
  fetch('/api/visitor-analytics',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',keepalive:action==='end',body:data}).catch(()=>{});
 }
 const update=()=>{if(ended)return;settle();send('pulse');if(visible())started=performance.now();};
 const change=()=>{if(ended)return;if(!visible())update();else if(started===null)started=performance.now();};
 if(visible())started=performance.now();send('start');
 document.addEventListener('visibilitychange',change);
 window.addEventListener('focus',change);window.addEventListener('blur',change);
 window.addEventListener('pagehide',()=>{if(ended)return;settle();ended=true;send('end',true);});
 window.addEventListener('pageshow',event=>{if(!event.persisted)return;viewId=crypto.randomUUID();seconds=0;ended=false;started=visible()?performance.now():null;send('start');});
 setInterval(()=>{if(!ended&&visible())update();},15000);
})();
'use strict';
(()=>{
 const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
 const menu=$('#menu-toggle');
 menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.textContent=open?'Close -':'Menu +';$('#navlinks')?.classList.toggle('open',open);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){menu.click();menu.focus();}});
 let amount=25,frequency='once';
 const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:Number.isInteger(v)?0:2}).format(v);
 function update(){const a=$('.donate-continue');if(!a)return;const valid=Number.isSafeInteger(Math.round(amount*100))&&amount>0&&amount<=1000000; a.href=valid?`/donate/?amount=${encodeURIComponent(amount)}&frequency=${frequency}`:'/donate/';a.textContent=valid?`Continue with ${money(amount)}${frequency==='monthly'?' monthly':''} \u2192`:'Review contribution information';const note=$('.donation-widget .tiny');if(note)note.textContent=(frequency==='monthly'?'Monthly giving selected.':'One-time giving selected.')+' Online contributions are not open yet.';}
 $$('.amount').forEach(b=>b.addEventListener('click',()=>{amount=Number(b.dataset.amount);const input=$('.other-amount');if(input)input.value='';$$('.amount').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});update();}));
 $('.other-amount')?.addEventListener('input',e=>{amount=Number(e.target.value);$$('.amount').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-pressed','false');});update();});
 $$('[data-frequency]').forEach(b=>b.addEventListener('click',()=>{frequency=b.dataset.frequency==='monthly'?'monthly':'once';$$('[data-frequency]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});update();}));
 const params=new URLSearchParams(location.search);const summary=$('#donate-summary');if(summary&&!summary.dataset.externalCheckout){const v=Number(params.get('amount')||25);summary.textContent=`Your ${money(Number.isFinite(v)&&v>0&&v<=1000000?v:25)} ${params.get('frequency')==='monthly'?'monthly':'one-time'} contribution`;}
 // The one campaign button retains the amount selected on the homepage.
 const checkoutButton=document.querySelector('.donate-form [href="/donate/continue"]');
 if(checkoutButton){
  const query=new URLSearchParams(location.search);
  const value=query.get('amount');
  if(value&&/^[1-9]\d{0,6}(?:\.\d{1,2})?$/.test(value)){
   checkoutButton.setAttribute('href','/donate/continue?amount='+encodeURIComponent(value));
  }
 }
 const status=params.get('checkout');
 if(status==='processing'||status==='cancelled'){
  const note=$('.donate-page .service-notice');
  if(note)note.textContent=status==='processing'?
   'You returned from the processor. A redirect alone is NOT proof of payment. Check your provider receipt and the campaign confirmation.':
   'Payment checkout was cancelled. No contribution was confirmed by this redirect.';
 }
 $('#donation-details')?.addEventListener('submit',e=>e.preventDefault());
 const roles={network:['Personal Network Organizer','Start with one respectful conversation with someone you know.','02'],digital:['Digital Ambassador','Share an approved campaign idea accurately, in your own voice.','03'],issue:['Issue Ambassador','Learn one issue deeply and use approved sources to answer questions.','04'],host:['Event Host','Plan a small gathering using the current host checklist.','07'],skills:['Skills & Operations Volunteer','Connect a practical skill with a campaign task.','13'],ballot:['Ballot-Access Petition Volunteer','Read the training first. Petition work needs current jurisdiction approval.','10']};
 function role(){const pref=$('#role-pref');if(!pref)return;let key=pref.value;if(key==='ballot'&&$('#role-training')?.value==='no')key='network';const r=roles[key]||roles.network;$('#role-result').textContent=r[0];const p=$('.chooser-result p');if(p)p.textContent=r[1]+' '+($('#role-time')?.value==='15-30 minutes'?'Start with a manageable first action.':'Use the playbook to plan your next step.');const link=$('#role-open');if(link){const href=link.getAttribute('href')||'';link.dataset.roleId=r[2];const canonical={'02':'network','03':'digital','04':'issue','05':'canvass','06':'phone','07':'host','08':'recruit','09':'captain','10':'ballot','11':'voter','12':'fundraising','13':'skills'};const dest=new URL(href,location.href);if(dest.pathname==='/roles'&&canonical[r[2]]){dest.searchParams.set('role',canonical[r[2]]);link.setAttribute('href',dest.toString());}}}
 ['role-pref','role-time','role-training'].forEach(id=>$('#'+id)?.addEventListener('change',role));role();

 // No trackers, shorteners, private account IDs or custom UTM parameters:
 // only a server-approved canonical production URL can leave this page.
 $$('[data-share-action]').forEach(b=>b.addEventListener('click',async()=>{
  const panel=b.closest('.issue-share');
  const value=panel?.dataset.shareUrl;
  const canonical=document.querySelector('link[rel="canonical"]')?.href;
  let url;
  try{
   const parsed=new URL(value);
   if(!canonical||parsed.href!==canonical||parsed.protocol!=='https:'||
      parsed.search||parsed.hash||parsed.username||parsed.password)return;
   url=parsed.href;
  }catch{return;}
  const status=panel.querySelector('[role="status"]');
  const notify=message=>{if(status)status.textContent=message;};
  try{
   if(b.dataset.shareAction==='native'&&typeof navigator.share==='function'){
    await navigator.share({title:document.title,url});
    notify('Sharing completed.');
   }else if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(url);
    notify('Page link copied.');
   }else notify('Copy the page address from your browser address bar.');
  }catch(error){
   notify(error?.name==='AbortError'?'Sharing cancelled.':'Sharing is unavailable. Copy the page address from your browser address bar.');
  }
 }));
 $$('.video-play').forEach(b=>b.addEventListener('click',()=>{
  const panel=b.closest('[data-video]');const id=panel?.dataset.video;
  if(!/^[a-zA-Z0-9_-]{11}$/.test(id||''))return;
  const original=Array.from(panel.childNodes);
  const iframe=document.createElement('iframe');
  iframe.title=panel.dataset.title+' video';
  iframe.src=`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
  iframe.allowFullscreen=true;iframe.tabIndex=0;
  iframe.referrerPolicy='strict-origin-when-cross-origin';
  iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');
  const controls=document.createElement('div');controls.className='video-session-controls';
  const stop=document.createElement('button');stop.type='button';stop.className='btn outline';
  stop.textContent='Stop video and disconnect YouTube';
  const fallback=document.createElement('a');fallback.href=`https://www.youtube.com/watch?v=${id}`;
  fallback.textContent='Open this video on YouTube';fallback.target='_blank';fallback.rel='noopener noreferrer';
  const note=document.createElement('p');note.textContent='If playback is unavailable here, you can open the video on YouTube. Disconnecting stops this player; it cannot undo information already sent.';
  controls.append(stop,fallback,note);panel.replaceChildren(iframe);panel.after(controls);
  stop.addEventListener('click',()=>{iframe.remove();panel.replaceChildren(...original);controls.remove();b.focus();},{once:true});
  stop.focus();
 }));
})();

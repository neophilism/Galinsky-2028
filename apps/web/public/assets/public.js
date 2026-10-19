'use strict';
(()=>{
 const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
 async function downloadSharingCard(item,issue,canonical){
  const response=await fetch('/api/public/sharing-assets?issue='+encodeURIComponent(issue),{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Asset unavailable');const current=(await response.json()).items?.find(a=>a.id===item.id&&a.revision===item.revision);if(!current||Date.parse(current.document.expiresAt)<=Date.now())throw Error('This asset changed or expired. Reload the collection.');
  const d=current.document;if(d.issue!==issue||d.rightsApproved!==true||(d.imagePath!=='/assets/candidate.webp'&&!/^\/campaign-media\/[0-9a-f-]{36}\.png$/.test(d.imagePath)))throw Error('Approved image is unavailable.');const image=new Image();image.src=d.imagePath;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=1000;const context=canvas.getContext('2d');
  const paragraphs=[[d.title,'bold 32px sans-serif'],[d.caption,'24px sans-serif'],[d.disclaimer,'bold 24px sans-serif'],[d.attribution,'20px sans-serif'],['Usage: '+d.usageTerms,'20px sans-serif'],[canonical,'20px sans-serif'],['Revision '+item.revision+' · Expires '+d.expiresAt,'18px sans-serif']],lines=[];
  for(const [text,font]of paragraphs){context.font=font;let line='';for(const char of String(text)){if(char==='\n'||context.measureText(line+char).width>920){lines.push({text:line,font});line=char==='\n'?'':char;}else line+=char;}if(line)lines.push({text:line,font});lines.push({text:'',font});}
  const imageHeight=Math.min(600,920*image.naturalHeight/image.naturalWidth);canvas.height=Math.ceil(80+imageHeight+lines.length*38);if(canvas.height>6000)throw Error('Use the printable card for this longer asset.');
  context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);const imageWidth=Math.min(920,imageHeight*image.naturalWidth/image.naturalHeight);context.drawImage(image,(1000-imageWidth)/2,40,imageWidth,imageHeight);context.fillStyle='#082653';context.textBaseline='top';let y=60+imageHeight;
  for(const line of lines){context.font=line.font;context.fillText(line.text,40,y);y+=38;}
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Card download unavailable');const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='galinsky-approved-card-'+item.id+'.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),30000);
 }
 document.addEventListener('click',async event=>{
  const assetButton=event.target?.closest?.('[data-sharing-assets]');if(!assetButton)return;
  const assetList=document.getElementById(assetButton.getAttribute('aria-controls'));if(!assetList)return;
  if(!assetList.hidden){assetList.hidden=true;assetButton.setAttribute('aria-expanded','false');return;}
  assetButton.disabled=true;assetList.replaceChildren();
  try{
   const response=await fetch('/api/public/sharing-assets?issue='+encodeURIComponent(assetButton.dataset.sharingAssets),{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('unavailable');const result=await response.json();if(!Array.isArray(result.items)||result.items.length>50)throw Error('invalid');
   const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
   for(const item of result.items){
    if(!/^[0-9a-f-]{36}$/.test(item.id)||!Number.isSafeInteger(item.revision)||!item.document||!['kirk-evers','garden','cornerstone'].includes(item.document.issue))throw Error('invalid');
    const d=item.document;if(d.imagePath!=='/assets/candidate.webp'&&!/^\/campaign-media\/[0-9a-f-]{36}\.png$/.test(d.imagePath))throw Error('invalid');
    const card=el('article');card.className='sharing-asset-card';card.append(el('h3',d.title));const image=el('img');image.src=d.imagePath;image.alt=d.alt;image.loading='lazy';card.append(image,el('p',d.caption),el('p',d.disclaimer),el('p',d.attribution),el('p','Usage: '+d.usageTerms),el('p','Revision '+item.revision+' · Expires '+d.expiresAt));
    const link=el('a','Open printable issue card');link.href='/share/cards/'+item.id+'/';link.className='btn outline';const download=el('button','Download card with disclaimer');download.type='button';download.className='btn outline';download.addEventListener('click',async()=>{download.disabled=true;try{await downloadSharingCard(item,d.issue,assetButton.closest('[data-share-url]').dataset.shareUrl);}catch(error){card.append(el('p',error.message||'Card download unavailable.'));}finally{download.disabled=false;}});card.append(link,download);assetList.append(card);
   }
   if(!result.items.length)assetList.append(el('p','No current campaign-approved image is published for this issue. The official page link and QR remain available.'));
  }catch{const p=document.createElement('p');p.textContent='Approved assets are temporarily unavailable. Use the official page link or QR code.';assetList.replaceChildren(p);}
  finally{assetButton.disabled=false;assetList.hidden=false;assetButton.setAttribute('aria-expanded','true');}
 });
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
   if(b.dataset.shareAction==='qr'){
    const box=panel.querySelector('#issue-share-qr');
    const canvas=box?.querySelector('.issue-share-qr-canvas');
    if(!box||!canvas)return;
    if(!box.hidden){
     box.hidden=true;b.setAttribute('aria-expanded','false');b.textContent='Show QR code';
     notify('QR code hidden.');return;
    }
    if(url.length>240){notify('This link is too long for the QR tool. Use Copy page link.');return;}
    b.disabled=true;
    try{
     if(typeof window.QRCode!=='function'){
      await new Promise((resolve,reject)=>{
       const script=document.createElement('script');
       script.src='/assets/vendor/qrcode.js';
       script.async=true;
       script.addEventListener('load',resolve,{once:true});
       script.addEventListener('error',()=>reject(new Error('qr_load_failed')),{once:true});
       document.head.appendChild(script);
      });
     }
     if(typeof window.QRCode!=='function')throw new Error('qr_unavailable');
     canvas.replaceChildren();
     new window.QRCode(canvas,{text:url,width:224,height:224,useSVG:true,
      colorDark:'#082653',colorLight:'#ffffff',correctLevel:window.QRCode.CorrectLevel.M});
     box.hidden=false;b.setAttribute('aria-expanded','true');b.textContent='Hide QR code';
     notify('QR code ready. It links to the official issue page.');
    }catch{
     box.hidden=true;b.setAttribute('aria-expanded','false');b.textContent='Show QR code';
     notify('Could not generate a QR code. Use Copy page link instead.');
    }finally{b.disabled=false;}
   }else if(b.dataset.shareAction==='native'&&typeof navigator.share==='function'){
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
  const analyticsEnabled=typeof window!=='undefined'&&window.__g28Analytics?.isActive?.()===true;
  iframe.src=`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`+
   (analyticsEnabled?`&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`:'');
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
  if(analyticsEnabled&&typeof CustomEvent==='function')
   window.dispatchEvent(new CustomEvent('g28:youtube-mounted',{detail:{iframe}}));
  stop.addEventListener('click',()=>{
   if(analyticsEnabled&&typeof CustomEvent==='function')
    window.dispatchEvent(new CustomEvent('g28:youtube-disconnected',{detail:{iframe}}));
   iframe.remove();panel.replaceChildren(...original);controls.remove();b.focus();
  },{once:true});
  stop.focus();
 }));
})();

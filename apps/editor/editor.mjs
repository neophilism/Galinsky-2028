const $=id=>document.getElementById(id);
const state={csrf:null,contract:null,catalog:new Map(),drafts:new Map(),left:null,right:null,next:null,settings:{version:0,settings:null},settingsDirty:false};
const element=(tag,text,attrs={})=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const label=(text,input)=>{const e=element('label',text);e.append(input);return e;};
const fieldLabel=name=>({eyebrow:'Small heading',headline:'Main heading',body:'Body text',body1:'First paragraph',body2:'Second paragraph',primaryLabel:'Primary button text',secondaryLabel:'Secondary button text',footnote:'Supporting note',buttonLabel:'Button text',linkLabel:'Link text',title:'Search and sharing title',description:'Search and sharing description'}[name]||human(name));
const human=s=>s.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('-',' ').replace(/^./,c=>c.toUpperCase());
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
async function request(path,{method='GET',data}={}){
 const headers={};if(method!=='GET'){headers['Content-Type']='application/json';headers['X-CSRF-Token']=state.csrf;}
 const response=await fetch(path.startsWith('/api/')?path:'/api/editorial'+path,{method,headers,credentials:'same-origin',body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(20000)});
 const result=await response.json();if(!response.ok){const error=Error(result.message||'The request failed.');error.status=response.status;throw error;}return result;
}
const act=fn=>async event=>{event?.preventDefault();try{await fn(event);}catch(error){message(error.message,true);}};
function button(text,fn,cls=''){const b=element('button',text,{type:'button'});if(cls)b.className=cls;b.addEventListener('click',act(fn));return b;}
function selectedIds(){return $('view').value==='compare'?[state.left,state.right]:[state.left];}
function current(id){return id?state.drafts.get(id):null;}
function fillSelect(select,items,selected,empty='Choose a campaign'){
 select.replaceChildren(new Option(empty,''));for(const item of items)select.add(new Option(item.name,item.id));
 if(selected&&!items.some(x=>x.id===selected))select.add(new Option('Selected campaign (outside this page)',selected));select.value=selected||'';
}
function refreshSelectors(){
 const items=[...state.catalog.values()];fillSelect($('left'),items,state.left);fillSelect($('right'),items,state.right);
 $('right-label').hidden=$('view').value!=='compare';$('swap').hidden=$('view').value!=='compare';$('filter').disabled=$('view').value!=='compare';
}
async function load(id,{force=false}={}){
 if(!id)return null;if(state.drafts.has(id)&&!force)return state.drafts.get(id);
 const record=await request('/campaigns/'+id);const value={record,document:structuredClone(record.document),dirty:false,busy:false};state.drafts.set(id,value);
 state.catalog.set(id,{id,name:record.document.internalName,draftRevision:record.revision,publishedRevision:record.publishedRevision,archived:record.archived});return value;
}
async function catalog({more=false}={}){
 const params=new URLSearchParams({search:$('search').value,archived:String($('show-archived').checked),limit:'30'});if(more&&state.next)params.set('after',state.next);
 const result=await request('/campaigns?'+params);if(!more){const retained=new Map([...state.catalog].filter(([id])=>selectedIds().includes(id)||state.drafts.get(id)?.dirty));state.catalog=retained;}
 for(const item of result.items)state.catalog.set(item.id,item);state.next=result.next;$('more').hidden=!result.next;
 if(!state.left&&result.items.length)state.left=result.items[0].id;
 if(!state.right&&result.items.length>1)state.right=result.items[1].id;
 await Promise.all(selectedIds().filter(Boolean).map(id=>load(id)));refreshSelectors();render();if(!state.settingsDirty)renderSettings();
}
function dirty(id){const d=current(id);d.dirty=true;document.querySelectorAll('[data-badge]').forEach(e=>{if(e.dataset.badge===id){e.textContent='Unsaved draft';e.classList.add('dirty');}});}
function optionsList(select,values,chosen){select.replaceChildren(...values.map(([value,name])=>new Option(name,value)));select.value=chosen;}
function previewUrl(path){const match=/^\/campaign-media\/([0-9a-f-]{36})\.png$/.exec(path);return match?'/api/editorial/media/'+match[1]:path==='/assets/candidate.webp'?'/api/editorial/builtin-hero':null;}

function heroEffectRecord(d){
 return d.document.heroBackground||{default:{...state.contract.heroEffectDefault},day:null,night:null};
}
function heroEffectAt(d,mode='default'){
 const data=heroEffectRecord(d);
 return data[mode]||data.default;
}
function updateHeroEffect(d,mode,key,value){
 const config=structuredClone(heroEffectRecord(d));
 if(mode!=='default'&&!config[mode])config[mode]={...config.default};
 config[mode]={...config[mode],[key]:value};
 d.document.heroBackground=config;
 markAndPreview(d.record.id);
}
function renderHeroPreview(box,id,mobile=false){
 const d=current(id),doc=d.document;box.className='hero-preview'+(mobile?' mobile':'');box.style.backgroundColor=doc.theme.background;box.style.color=doc.theme.text;
 box.style.setProperty('--campaign-brand-red',doc.theme.brandRed);
 box.style.setProperty('--campaign-brand-blue',doc.theme.brandBlue);
 box.style.setProperty('--campaign-surface',doc.theme.surface);
 box.style.setProperty('--campaign-background',doc.theme.background);
 box.style.setProperty('--campaign-text',doc.theme.text);
 const effect=heroEffectAt(d,d.effectEditMode||'default');
 let layer=box.querySelector('.campaign-hero-effect');
 if(effect.preset==='none'||effect.preset==='legacy'){layer?.remove();box.dataset.effect=effect.preset;}
 else{
  if(!layer){
   layer=element('div',null,{class:'campaign-hero-effect','aria-hidden':'true'});
   for(const suffix of ['a','b','c'])layer.append(element('span',null,{class:'hfx-layer hfx-'+suffix}));
   box.prepend(layer);
  }
  layer.dataset.effect=effect.preset;layer.dataset.animated=String(effect.animated&&effect.speed!=='still');
  layer.dataset.speed=effect.speed;layer.dataset.running='true';
  layer.style.setProperty('--hfx-opacity',(effect.opacity/100).toFixed(2));
  layer.style.setProperty('--hfx-intensity',(effect.intensity/100).toFixed(2));
  layer.style.setProperty('--hfx-blur',Math.round(effect.blur*.9)+'px');
  layer.style.setProperty('--hfx-duration',(effect.speed==='medium'?22:44)+'s');
  box.dataset.effect=effect.preset;
 }
 let copy=box.querySelector('[data-hero-copy]'),img=box.querySelector('img');
 if(!copy){copy=element('div',null,{'data-hero-copy':'true'});box.append(copy);}
 if(!img){img=element('img');box.append(img);}
 copy.replaceChildren(element('p',doc.fields['home.hero.eyebrow']||'Hero eyebrow'),element('h3',doc.fields['home.hero.headline']||'Hero headline'),element('p',doc.fields['home.hero.body']||'Hero body'));
 img.alt=doc.hero.alt;const src=previewUrl(doc.hero.assetPath);if(src&&img.getAttribute('src')!==src)img.src=src;else if(!src)img.removeAttribute('src');img.style.objectPosition=`${mobile?doc.hero.mobileFocalX:doc.hero.focalX}% ${mobile?doc.hero.mobileFocalY:doc.hero.focalY}%`;
}
function markAndPreview(id){dirty(id);document.querySelectorAll('[data-preview]').forEach(box=>{if(box.dataset.preview===id)renderHeroPreview(box,id,box.dataset.mobile==='true');});}
async function operation(id,fn){const d=current(id);if(d.busy)return;d.busy=true;render();try{await fn(d);}finally{d.busy=false;render();refreshSelectors();}}
async function save(id){await operation(id,async d=>{
 let saved;try{saved=await request('/campaigns/'+id,{method:'PUT',data:{expectedRevision:d.record.revision,document:d.document}});}catch(error){if(error.status===409)d.conflicted=true;throw error;}d.record={...d.record,...saved};d.document=structuredClone(saved.document);d.dirty=false;d.conflicted=false;state.catalog.set(id,{...state.catalog.get(id),name:d.document.internalName,draftRevision:saved.revision});message('Draft saved. The website has not changed.');
 });}
function cleanRequired(id){if(current(id).dirty)throw Error('Save this draft before publishing, duplicating, archiving or restoring.');}
async function publish(id){cleanRequired(id);if(!confirm('Publish this saved revision? Every active assignment of this campaign will move to it.'))return;await operation(id,async d=>{await request('/campaigns/'+id+'/publish',{method:'POST',data:{expectedRevision:d.record.revision}});await load(id,{force:true});if(!state.settingsDirty){state.settings=await request('/settings');renderSettings();}message('Revision published. Public delivery still depends on the website runtime being enabled.');});}
async function duplicate(id){cleanRequired(id);const name=prompt('Name for the independent duplicate');if(!name)return;const source=current(id);const created=await request('/campaigns/'+id+'/duplicate',{method:'POST',data:{expectedRevision:source.record.revision,name}});state.left=created.id;await load(created.id);refreshSelectors();render();message('Independent duplicate created.');}
async function archive(id){cleanRequired(id);const d=current(id),archived=!d.record.archived;if(!confirm(archived?'Archive this campaign? Active website assignments must first be replaced.':'Restore this archived campaign?'))return;await operation(id,async()=>{await request('/campaigns/'+id+'/archive',{method:'POST',data:{expectedRevision:d.record.revision,expectedLifecycleVersion:d.record.lifecycleVersion,archived}});await load(id,{force:true});message(archived?'Campaign archived.':'Campaign restored.');});}
async function upload(id,file){
 if(!file)return;if(!['image/png','image/jpeg','image/webp','image/avif'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose a PNG, JPEG, WebP or AVIF under 10 MB.');
 const bitmap=await createImageBitmap(file);try{
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>50000000)throw Error('This source image is too large. Resize it first.');
  const scale=Math.min(1,2048/bitmap.width,2048/bitmap.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const base64=canvas.toDataURL('image/png').split(',')[1];
  if(base64.length>Math.ceil(4*1024*1024/3)*4)throw Error('The normalized image is over 4 MB. Resize or simplify it first.');
  const saved=await request('/media',{method:'POST',data:{base64}});current(id).document.hero.assetPath=saved.path;markAndPreview(id);message('Image uploaded and selected in this draft. Add its description, then save.');
 }finally{bitmap.close();}
}
async function mediaPicker(select,chosen,after=null){const result=await request('/media'+(after?'?after='+encodeURIComponent(after):''));if(!after){select.replaceChildren(new Option('Current selection',chosen),new Option('Existing approved portrait','/assets/candidate.webp'));}for(const item of result.items)select.add(new Option(`Uploaded image ${item.id.slice(0,8)} (${item.width} x ${item.height})`,item.path));select.dataset.next=result.next||'';select.value=chosen;}
function panel(id,index){
 const d=current(id),box=element('section',null,{class:'card panel'});if(!d){box.append(element('p','Select a campaign to begin.'));return box;}
 const fs=element('fieldset');fs.disabled=d.busy;box.append(fs);fs.append(element('legend',index===0?'Campaign':'Comparison campaign'));
 const name=element('input',null,{maxlength:160,'aria-label':'Editorial campaign name'});name.value=d.document.internalName;name.addEventListener('input',()=>{d.document.internalName=name.value;dirty(id);});fs.append(label('Private editorial name',name));
 const badge=element('p',d.dirty?'Unsaved draft':`Draft revision ${d.record.revision} | Published: ${d.record.publishedRevision??'none'}`,{class:'badge'+(d.dirty?' dirty':''),'data-badge':id});fs.append(badge);
 if(d.conflicted){fs.append(element('p','A newer revision exists. Your unsaved work is still here. Save it separately to compare against the newer revision, or explicitly reload the saved version.',{class:'contrast-warning'}),button('Save conflicting draft separately',async()=>{const name=prompt('Private name for this preserved draft');if(!name)return;await operation(id,async()=>{const created=await request('/campaigns',{method:'POST',data:{document:{...d.document,internalName:name}}});await load(created.id);await load(id,{force:true});state.left=created.id;state.right=id;$('view').value='compare';message('Your work is preserved as a separate campaign alongside the latest saved revision.');});}),button('Reload saved revision',async()=>{if(d.dirty&&!confirm('Discard the unsaved changes in this campaign and load its latest saved revision?'))return;await load(id,{force:true});render();message('Latest saved revision loaded.');}));}
 const actions=element('div',null,{class:'actions'});actions.append(button('Save draft',()=>save(id),'primary'),button('Duplicate',()=>duplicate(id)));
 if(state.contract.role==='owner')actions.append(button('Publish',()=>publish(id)),button(d.record.archived?'Unarchive':'Archive',()=>archive(id)));
 fs.append(actions);if(d.record.archived)fs.append(element('p','Archived: unarchive before saving or publishing.'));
 const hero=element('details');hero.open=false;hero.append(element('summary','Hero image and preview'));
 const controls=element('div',null,{class:'hero-controls'}),alt=element('input',null,{maxlength:500});alt.value=d.document.hero.alt;alt.addEventListener('input',()=>{d.document.hero.alt=alt.value;markAndPreview(id);});const altLabel=label('Image description (alt text)',alt);altLabel.className='full';controls.append(altLabel);
 const select=element('select');select.add(new Option('Current image',d.document.hero.assetPath));select.add(new Option('Existing approved portrait','/assets/candidate.webp'));select.value=d.document.hero.assetPath;
 select.addEventListener('change',()=>{d.document.hero.assetPath=select.value;markAndPreview(id);});controls.append(label('Choose an image',select),button('Browse uploaded images',async()=>{await mediaPicker(select,d.document.hero.assetPath,select.dataset.next||null);}));
 const file=element('input',null,{type:'file',accept:'image/png,image/jpeg,image/webp,image/avif'});file.addEventListener('change',act(async()=>{const selected=file.files[0];file.value='';await operation(id,()=>upload(id,selected));}));const fileLabel=label('Upload a replacement',file);fileLabel.className='full';controls.append(fileLabel);
 for(const key of ['focalX','focalY','mobileFocalX','mobileFocalY']){const input=element('input',null,{type:'range',min:0,max:100,step:1});input.value=d.document.hero[key];const output=element('output',input.value);input.addEventListener('input',()=>{d.document.hero[key]=Number(input.value);output.textContent=input.value;markAndPreview(id);});const l=label(human(key),input);l.append(output);controls.append(l);}
 hero.append(controls);
 const effects=element('div',null,{class:'effect-controls'});
 effects.append(element('h3','Hero background effect'),element('p','Decorative layers always stay behind the headline and portrait. Settings are saved with this campaign draft.',{class:'muted'}));
 const appearanceSelect=element('select',null,{'aria-label':'Edit hero background for appearance'});
 optionsList(appearanceSelect,[['default','Default effect'],['day','Day appearance override'],['night','Night appearance override']],d.effectEditMode||'default');
 effects.append(label('Appearance to configure',appearanceSelect));
 const inherit=element('input',null,{type:'checkbox'}),inheritLabel=label('Inherit default effect for this appearance',inherit);inheritLabel.className='check';
 effects.append(inheritLabel);
 const effectGrid=element('div',null,{class:'effect-grid'});
 const preset=element('select',null,{'aria-label':'Background effect preset'});
 optionsList(preset,state.contract.heroEffectPresets.map(entry=>[entry.id,entry.label]),heroEffectAt(d).preset);
 effectGrid.append(label('Background style',preset));
 const speed=element('select',null,{'aria-label':'Background motion speed'});
 optionsList(speed,state.contract.heroEffectSpeeds.map(name=>[name,human(name)]),'slow');
 effectGrid.append(label('Motion speed',speed));
 const enabled=element('input',null,{type:'checkbox'}),enabledLabel=label('Enable animation',enabled);enabledLabel.className='check';
 effectGrid.append(enabledLabel);
 const sliders=new Map();
 for(const [key,title]of [['intensity','Intensity'],['opacity','Opacity'],['blur','Blur / softness']]){
  const input=element('input',null,{type:'range',min:0,max:100,step:1,'aria-label':title}),output=element('output');
  const wrap=label(title,input);wrap.append(output);effectGrid.append(wrap);sliders.set(key,{input,output});
 }
 effects.append(effectGrid);
 function refreshEffectInputs(){
  const mode=appearanceSelect.value;d.effectEditMode=mode;
  const value=heroEffectAt(d,mode),inherited=mode!=='default'&&!heroEffectRecord(d)[mode];
  inheritLabel.hidden=mode==='default';inherit.checked=inherited;
  for(const input of effectGrid.querySelectorAll('input,select'))input.disabled=inherited||d.busy||d.record.archived;
  preset.value=value.preset;speed.value=value.speed;enabled.checked=value.animated;
  for(const [key,{input,output}]of sliders){input.value=value[key];output.textContent=value[key]+'%';}
  renderHeroPreview(preview,id,preview.dataset.mobile==='true');
 }
 appearanceSelect.addEventListener('change',refreshEffectInputs);
 inherit.addEventListener('change',()=>{
  const mode=appearanceSelect.value;if(mode==='default')return;
  const config=structuredClone(heroEffectRecord(d));
  config[mode]=inherit.checked?null:{...config.default};
  d.document.heroBackground=config;markAndPreview(id);refreshEffectInputs();
 });
 const change=(key,value)=>{updateHeroEffect(d,appearanceSelect.value,key,value);};
 preset.addEventListener('change',()=>change('preset',preset.value));
 speed.addEventListener('change',()=>change('speed',speed.value));
 enabled.addEventListener('change',()=>change('animated',enabled.checked));
 for(const [key,{input,output}]of sliders)input.addEventListener('input',()=>{output.textContent=input.value+'%';change(key,Number(input.value));});
 hero.append(effects);
 const preview=element('div',null,{'data-preview':id,'data-mobile':'false'});
 renderHeroPreview(preview,id);
 hero.append(preview,button('Toggle mobile hero preview',()=>{preview.dataset.mobile=String(preview.dataset.mobile!=='true');renderHeroPreview(preview,id,preview.dataset.mobile==='true');}));
 refreshEffectInputs();
 fs.append(hero);
 const colors=element('details');colors.append(element('summary','Colors'));const grid=element('div',null,{class:'theme-grid'});for(const key of state.contract.themeTokens){const input=element('input',null,{type:'color'});input.value=d.document.theme[key];input.addEventListener('input',()=>{d.document.theme[key]=input.value.toUpperCase();markAndPreview(id);});grid.append(label(human(key),input));}colors.append(grid,element('p','Publishing validates text and focus contrast. Brand accents do not replace readable text colors.',{class:'muted'}));fs.append(colors);
 const history=element('details');history.append(element('summary','Revision history'));const revisions=element('select');const restoreButton=button('Restore as a new draft',async()=>{cleanRequired(id);if(!revisions.value)return;if(!confirm('Restore this revision into a new draft? The published website will not change.'))return;await operation(id,async()=>{await request('/campaigns/'+id+'/restore',{method:'POST',data:{expectedRevision:d.record.revision,sourceRevision:Number(revisions.value)}});await load(id,{force:true});message('Historical revision restored as a new draft.');});});history.append(button('Load history',async()=>{const result=await request('/campaigns/'+id+'/history'+(revisions.dataset.next?'?before='+revisions.dataset.next:''));if(!revisions.dataset.next)revisions.replaceChildren();for(const item of result.items)revisions.add(new Option('Revision '+item.revision,item.revision));revisions.dataset.next=result.next||'';}),label('Saved revision',revisions),restoreButton);fs.append(history);return box;
}
function sections(preferred=''){const values=[...new Set(state.contract.fields.filter(x=>x.page===$('page').value).map(x=>x.section))];optionsList($('section'),[['','All sections'],...values.map(value=>[value,human(value)])],values.includes(preferred)?preferred:'');}
function renderDraftPreview(){
 const target=$('fields');target.replaceChildren();
 const d=current(state.left);if(!d){target.append(element('p','Choose a campaign to preview.',{class:'empty'}));return;}
 const box=element('section',null,{class:'card'}),controls=element('div',null,{class:'preview-controls'}),frame=element('iframe',null,{title:'Unpublished campaign page preview',sandbox:'allow-same-origin',referrerpolicy:'no-referrer',class:'draft-page-frame'});
 const labelText=element('p','Draft preview: unsaved text, colors, portrait and hero background. This does not publish changes.',{class:'muted'});
 const appearance=element('select',null,{'aria-label':'Draft preview appearance'});
 optionsList(appearance,[['default','Default effect'],['day','Day effect'],['night','Night effect']],'default');
 const status=element('p','',{'role':'status'});
 let sequence=0;
 const refresh=async()=>{const requested=++sequence;status.textContent='Rendering private draft...';try{
   const result=await request('/preview',{method:'POST',data:{page:$('page').value,appearance:appearance.value,document:structuredClone(current(state.left).document)}});
   if(sequence!==requested)return;frame.srcdoc=result.html;status.textContent='This page reflects your current draft. The published website is unchanged.';
  }catch(error){if(sequence===requested){status.textContent='Complete every required field and resolve contrast warnings before previewing.';message(error.message,true);}}
 };
 const size=(mobile)=>{frame.classList.toggle('mobile',mobile);status.textContent=mobile?'Mobile-width preview.':'Desktop-width preview.';};
 controls.append(button('Refresh current draft',refresh,'primary'),label('Preview appearance',appearance),button('Desktop width',()=>size(false)),button('Mobile width',()=>size(true)));
 appearance.addEventListener('change',()=>void refresh());
 box.append(element('h2','Unpublished page preview'),labelText,controls,status,frame);target.append(box);void refresh();
}
function renderFields(){
 if($('view').value==='preview'){renderDraftPreview();return;}
 const ids=selectedIds(),page=$('page').value,compare=ids.length===2;const target=$('fields');target.replaceChildren();
 const drafts=ids.map(current);if(drafts.some(x=>!x)){target.append(element('p','Choose the campaign'+(compare?'s':'')+' above.',{class:'empty'}));return;}
 for(const field of state.contract.fields.filter(x=>x.page===page&&(!$('section').value||x.section===$('section').value))){
  const values=drafts.map(d=>d.document.fields[field.key]??null);const status=values.some(x=>x===null)?'missing':!compare||values[0]===values[1]?'identical':'changed';
  if(compare&&$('filter').value!=='all'&&$('filter').value!==status)continue;
  const row=element('div',null,{class:'field-row '+status});const head=element('div'),title=element('h3',human(field.section)+' / '+fieldLabel(field.label),{class:'field-title'});title.title=field.key;head.append(title,element('span',status,{class:'field-state'}));row.append(head);
  const cells=element('div',null,{class:'cells'+(!compare?' single':'')});ids.forEach((id,index)=>{
   const d=current(id),input=element('textarea',null,{maxlength:field.maxLength,'data-id':id,'data-key':field.key});input.value=values[index]??'';input.disabled=d.busy||d.record.archived;
   input.addEventListener('input',()=>{if(input.value.trim())d.document.fields[field.key]=input.value;else delete d.document.fields[field.key];markAndPreview(id);const live=ids.map(x=>current(x).document.fields[field.key]??null);const kind=live.some(x=>x===null)?'missing':!compare||live[0]===live[1]?'identical':'changed';row.className='field-row '+kind;head.querySelector('.field-state').textContent=kind;document.querySelectorAll('textarea[data-id]').forEach(other=>{if(other!==input&&other.dataset.id===id&&other.dataset.key===field.key)other.value=input.value;});});
   cells.append(label(compare?(index===0?'Left campaign':'Right campaign'):fieldLabel(field.label),input));
  });row.append(cells);
  if(compare&&ids[0]!==ids[1])row.append(button('Copy left to right',()=>{if(current(ids[1]).busy||current(ids[1]).record.archived)return;if(values[1]!=null&&!confirm('Replace this field in the right-hand draft with the left-hand text?'))return;const fresh=current(ids[0]).document.fields[field.key];if(fresh==null)delete current(ids[1]).document.fields[field.key];else current(ids[1]).document.fields[field.key]=fresh;dirty(ids[1]);renderFields();},'small'));
  target.append(row);
 }
}
function render(){if(!state.contract)return;$('panels').className='panels'+($('view').value==='single'?' single':'');$('panels').replaceChildren(...selectedIds().map(panel));renderFields();}
function renderSettings(){
 const s=state.settings.settings,published=[...state.catalog.values()].filter(x=>x.publishedRevision&&!x.archived);for(const key of ['default','day','night'])fillSelect($(key+'-campaign'),published,s?.[key]?.campaignId,'Choose a published campaign');
 $('mode-switching').checked=s?.modeSwitching??false;$('mode-pickers').hidden=!$('mode-switching').checked;$('save-settings').disabled=state.contract?.role!=='owner';$('settings-status').textContent=state.settings.version?'Settings version '+state.settings.version:'Not configured';
}
async function saveSettings(){
 const choose=key=>{const value=$(key+'-campaign').value;if(!value)return null;const catalogEntry=state.catalog.get(value),existing=state.settings.settings?.[key];const revision=catalogEntry?.publishedRevision||(existing?.campaignId===value?existing.revision:null);if(!revision)throw Error('Choose a published campaign.');return{campaignId:value,revision};};
 const data={expectedVersion:state.settings.version,settings:{schemaVersion:1,modeSwitching:$('mode-switching').checked,default:choose('default'),day:choose('day'),night:choose('night')}};
 const controls=[...$('settings-form').querySelectorAll('input,select,button')];controls.forEach(control=>{control.disabled=true;});
 try{state.settings=await request('/settings',{method:'PUT',data});state.settingsDirty=false;renderSettings();message('Website selections saved.');}
 finally{controls.forEach(control=>{control.disabled=false;});$('save-settings').disabled=state.contract?.role!=='owner';}
}
async function create(){
 const name=prompt('Private name for the new campaign');if(!name)return;const selected=current(state.left)?.document;
 const theme=selected?structuredClone(selected.theme):Object.fromEntries(state.contract.themeTokens.map(key=>[key,['background','surface','primaryText','secondaryText'].includes(key)?'#FFFFFF':'#000000']));
 const hero=selected?structuredClone(selected.hero):{assetPath:state.contract.builtinHero,alt:'Describe the selected portrait',focalX:50,focalY:50,mobileFocalX:50,mobileFocalY:50};
 const background=selected?.heroBackground?structuredClone(selected.heroBackground):{default:{...state.contract.heroEffectDefault},day:null,night:null};
 const created=await request('/campaigns',{method:'POST',data:{document:{schemaVersion:1,internalName:name,fields:{},theme,hero,heroBackground:background}}});state.left=created.id;await load(created.id);refreshSelectors();render();message('Blank campaign created. Fill every required field before publication.');
}
let sharingCurrent=null,sharingDirty=false,sharingEditGeneration=0;
async function sharingCatalog(after=null,append=false){const result=await request('/sharing-assets?limit=30'+(after?'&after='+encodeURIComponent(after):''));if(!append)$('sharing-list').replaceChildren();for(const a of result.items){const p=element('p');p.append(button(a.document.title,()=>editSharing(a)),element('span',' · '+a.status+' · draft '+a.revision+(a.publishedRevision?' · published '+a.publishedRevision:'')));$('sharing-list').append(p);}if(result.next){const more=button('Load more sharing assets',async()=>{await sharingCatalog(result.next,true);more.remove();});$('sharing-list').append(more);}}

async function editSharing(asset=null){
 if(sharingDirty&&!confirm('Discard the unsaved sharing draft?'))return;
 const generation=++sharingEditGeneration,form=$('sharing-form'),wasHidden=form.hidden;form.hidden=true;
 let images;try{images=await request('/media?limit=100');}catch(error){if(generation===sharingEditGeneration)form.hidden=wasHidden;throw error;}
 if(generation!==sharingEditGeneration)return;
 sharingCurrent=asset;sharingDirty=false;$('sharing-heading').textContent=asset?'Edit sharing asset':'New sharing asset';
 const picker=$('sharing-image');picker.replaceChildren(new Option('Campaign portrait','/assets/candidate.webp'));for(const image of images.items)picker.add(new Option('Campaign upload '+image.id,'/campaign-media/'+image.id+'.png'));
 const d=asset?.document||{};for(const [id,key]of Object.entries({'issue':'issue','title':'title','image':'imagePath','alt':'alt','caption':'caption','disclaimer':'disclaimer','terms':'usageTerms','attribution':'attribution','rights-url':'rightsReferenceUrl'}))$('sharing-'+id).value=d[key]|| (id==='issue'?'kirk-evers':id==='image'?'/assets/candidate.webp':'');
 if(d.imagePath&&!Array.from(picker.options).some(o=>o.value===d.imagePath))picker.add(new Option('Current image',d.imagePath));if(d.imagePath)picker.value=d.imagePath;
 $('sharing-expires').value=d.expiresAt?new Date(Date.parse(d.expiresAt)-new Date(d.expiresAt).getTimezoneOffset()*60000).toISOString().slice(0,16):'';$('sharing-rights-approved').checked=d.rightsApproved===true;
 $('sharing-publish').disabled=state.contract.role!=='owner'||!asset;$('sharing-withdraw').disabled=state.contract.role!=='owner'||!asset?.publicationVersion||asset.status!=='published';$('sharing-status').textContent=asset?'Draft '+asset.revision+'; publication '+asset.status+'.':'Save a private draft first.';form.hidden=false;
}
function sharingInput(){const value=id=>$('sharing-'+id).value;return {schemaVersion:1,issue:value('issue'),title:value('title'),imagePath:value('image'),alt:value('alt'),caption:value('caption'),disclaimer:value('disclaimer'),usageTerms:value('terms'),attribution:value('attribution'),rightsReferenceUrl:value('rights-url'),rightsApproved:$('sharing-rights-approved').checked,expiresAt:new Date(value('expires')).toISOString()};}
$('sharing-load').addEventListener('click',act(()=>sharingCatalog()));$('sharing-new').addEventListener('click',act(()=>editSharing()));$('sharing-form').addEventListener('input',()=>{sharingDirty=true;});
$('sharing-form').addEventListener('submit',act(async()=>{const document=sharingInput(),result=await request('/sharing-assets'+(sharingCurrent?'/'+sharingCurrent.id:''),{method:sharingCurrent?'PUT':'POST',data:sharingCurrent?{document,expectedRevision:sharingCurrent.revision}:{document}});sharingDirty=false;await editSharing(result);await sharingCatalog();$('sharing-status').textContent='Sharing draft saved. The public asset has not changed.';}));
$('sharing-publish').addEventListener('click',act(async()=>{if(sharingDirty)throw Error('Save the sharing draft before publishing.');if(!sharingCurrent)return;const result=await request('/sharing-assets/'+sharingCurrent.id+'/publish',{method:'POST',data:{expectedRevision:sharingCurrent.revision,expectedPublicationVersion:sharingCurrent.publicationVersion}});await editSharing(result);await sharingCatalog();$('sharing-status').textContent='Approved asset published. Only the current public revision is available.';}));
$('sharing-withdraw').addEventListener('click',act(async()=>{if(!sharingCurrent||!confirm('Withdraw this asset from current sharing collections and print cards?'))return;const result=await request('/sharing-assets/'+sharingCurrent.id+'/withdraw',{method:'POST',data:{expectedPublicationVersion:sharingCurrent.publicationVersion}});if(sharingDirty){sharingCurrent=result;$('sharing-withdraw').disabled=true;await sharingCatalog();$('sharing-status').textContent='Asset withdrawn. Your unsaved draft stays in the form.';}else{await editSharing(result);await sharingCatalog();$('sharing-status').textContent='Asset withdrawn. Current sharing collections and print cards no longer serve it.';}}));
window.addEventListener('beforeunload',event=>{if(sharingDirty){event.preventDefault();event.returnValue='';}});
$('search-form').addEventListener('submit',act(()=>catalog()));$('more').addEventListener('click',act(()=>catalog({more:true})));$('new').addEventListener('click',act(create));
for(const side of ['left','right'])$(side).addEventListener('change',act(async()=>{state[side]=$(side).value||null;await load(state[side]);render();}));
$('view').addEventListener('change',act(async()=>{await Promise.all(selectedIds().filter(Boolean).map(id=>load(id)));refreshSelectors();render();}));$('page').addEventListener('change',()=>{sections();renderFields();});$('section').addEventListener('change',renderFields);$('filter').addEventListener('change',renderFields);
$('swap').addEventListener('click',()=>{[state.left,state.right]=[state.right,state.left];refreshSelectors();render();});
$('mode-switching').addEventListener('change',()=>{$('mode-pickers').hidden=!$('mode-switching').checked;state.settingsDirty=true;});
for(const key of ['default','day','night'])$(key+'-campaign').addEventListener('change',()=>{state.settingsDirty=true;});$('settings-form').addEventListener('submit',act(saveSettings));
window.addEventListener('beforeunload',event=>{if(state.settingsDirty||[...state.drafts.values()].some(d=>d.dirty)){event.preventDefault();event.returnValue='';}});
try{const session=await request('/api/session');state.csrf=session.csrf;state.contract=await request('/contract');const pages=[...new Set(state.contract.fields.map(x=>x.page))];optionsList($('page'),pages.map(page=>[page,human(page)]),'home');sections('hero');state.settings=await request('/settings');await catalog();message('Ready. Saving creates a draft; publishing is a separate action.');}catch(error){message(error.message+' Use Account & sign-in for your existing owner or editor account.',true);}

// Non-sensitive appearance preferences only. No identity, location or political inference.
export const CAMPAIGN_MODE_SCRIPT=`(function(){
'use strict';
var root=document.documentElement;
if(root.dataset.campaignModeEnabled!=='true')return;
var preference=root.dataset.campaignPreference;
var query=window.matchMedia('(prefers-color-scheme: dark)');
function cookie(name,value){try{document.cookie=name+'='+value+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');}catch(_) {}}
function apply(){
 var wanted=preference==='system'?(query.matches?'night':'day'):preference;
 cookie('g28-appearance',preference);cookie('g28-system-mode',query.matches?'night':'day');
 if(root.dataset.campaignMode!==wanted){
  var url=new URL(location.href);url.searchParams.set('appearance',preference);url.searchParams.set('scheme',wanted);
  // An explicit matching query prevents a reload loop when cookies are blocked.
  if(location.search!==url.search){root.style.visibility='hidden';location.replace(url.pathname+url.search+url.hash);}
 }
}
// Listen immediately: a system change during document loading must not be lost.
if(query.addEventListener)query.addEventListener('change',function(){if(preference==='system')apply();});
apply();
function start(){
 var form=document.querySelector('.campaign-appearance');
 if(form)form.addEventListener('submit',function(){
  var value=form.elements.appearance.value;
  if(['system','day','night'].indexOf(value)<0)return;
  cookie('g28-appearance',value);
  if(value==='system'){
   var hidden=document.createElement('input');hidden.type='hidden';hidden.name='scheme';hidden.value=query.matches?'night':'day';form.appendChild(hidden);
  }
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();`;
export function campaignPreferences(rawUrl,cookieHeader=''){
 const query=new URL(rawUrl,'https://campaign.invalid').searchParams;
 const cookies=new Map();
 if(typeof cookieHeader==='string'&&cookieHeader.length<=8192)for(const part of cookieHeader.split(';')){const [name,...tail]=part.trim().split('=');if(!cookies.has(name))cookies.set(name,tail.join('='));}
 const explicit=query.get('appearance');
 const preference=['day','night','system'].includes(explicit)?explicit:['day','night','system'].includes(cookies.get('g28-appearance'))?cookies.get('g28-appearance'):'system';
 const explicitScheme=query.get('scheme'),saved=cookies.get('g28-system-mode');
 const systemMode=['day','night'].includes(explicitScheme)?explicitScheme:['day','night'].includes(saved)?saved:null;
 return{preference,systemMode,explicit:['day','night','system'].includes(explicit)};
}

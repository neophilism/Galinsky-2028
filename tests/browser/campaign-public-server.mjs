import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {createPrivatePreviewServer} from '../../apps/web/private-preview.mjs';
import {createCampaignRuntime} from '../../apps/web/campaign-runtime.mjs';
import {fixture,id} from '../campaign-fixture.mjs';
import {publicCampaignDocument,CampaignError} from '../../packages/core/campaign-content.mjs';
export async function startCampaignPublicHarness({directory=resolve('dist/web'),readTemplate=null}={}){
 const password=randomBytes(32).toString('hex');
 const env={PREVIEW_ACCESS_PASSWORD:password,G28_PUBLIC_MODE:'preview',G28_CAMPAIGN_PUBLIC_ENABLED:'true'};
 let enabled=true,revision=1,reads=0,error=null;
 const documents={};
 for(const mode of ['day','night','default']){
  const d=fixture();d.hero.assetPath='/assets/candidate.webp';d.hero.alt='Synthetic published portrait description';
  for(const field of Object.keys(d.fields))d.fields[field]=field.endsWith('title')?`Synthetic ${mode} title`:'Synthetic supporting text';
  d.fields['global.branding.slogan']='Synthetic '+mode;
  d.fields['home.hero.headline']=mode==='night'?'A longer synthetic headline\nfor responsive layout testing':'Synthetic day\nheading';
  d.fields['home.hero.body']='Synthetic supporting text for a complete published page.';
  if(mode==='night')d.theme={background:'#101010',surface:'#202020',text:'#FFFFFF',mutedText:'#CCCCCC',primary:'#FFFFFF',primaryText:'#000000',secondary:'#FFFFFF',secondaryText:'#000000',link:'#FFFFFF',border:'#777777',focus:'#FFFFFF',brandRed:'#FFFFFF',brandBlue:'#FFFFFF'};
  documents[mode]=publicCampaignDocument(d);
 }
 const store={snapshot:async p=>{reads++;if(error)throw error;const mode=enabled?(p.preference==='system'?(p.systemMode||'day'):p.preference):'default';return{settingsVersion:revision,modeSwitching:enabled,selection:{campaignId:id(mode==='night'?2:1),revision,mode},document:structuredClone(documents[mode])};},asset:async()=>{throw new CampaignError('asset_not_found','Missing',404);}};
 const runtime=createCampaignRuntime({env,directory,readTemplate,store});await runtime.ready();
 const server=createPrivatePreviewServer({directory,env,campaignRuntime:runtime});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return{server,origin:`http://127.0.0.1:${server.address().port}`,password,documents,reads:()=>reads,disable:()=>{enabled=false;revision++;},publish:()=>{revision++;},fail:value=>{error=value;},close:()=>new Promise(resolve=>server.close(resolve))};
}

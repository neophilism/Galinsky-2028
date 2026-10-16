import {CAMPAIGN_FIELDS,THEME_TOKENS} from '../packages/core/campaign-content.mjs';
export const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export function fixture(){return{schemaVersion:1,internalName:'Synthetic example',fields:Object.fromEntries(CAMPAIGN_FIELDS.map(({key})=>[key,'Synthetic text'])),theme:Object.fromEntries(THEME_TOKENS.map(key=>[key,['background','surface','primaryText','secondaryText'].includes(key)?'#FFFFFF':'#000000'])),hero:{assetPath:'/assets/test.webp',alt:'Synthetic image',focalX:50,focalY:40,mobileFocalX:50,mobileFocalY:20}};}
export function settings(enabled=true){return{schemaVersion:1,modeSwitching:enabled,default:{campaignId:id(1),revision:1},day:{campaignId:id(2),revision:2},night:{campaignId:id(3),revision:3}};}

import {renderPage} from '../../../scripts/public-renderer.mjs';
import {CAMPAIGN_PAGE_KEYS,compileCampaignTemplate,renderCampaignTemplate} from '../../../packages/core/campaign-template.mjs';
import {publicCampaignDocument,campaignFailure} from '../../../packages/core/campaign-content.mjs';
import {CAMPAIGN_PRESENTATION_CSS} from '../../../packages/core/campaign-presentation.mjs';

const ROUTES=Object.freeze({
 home:'index',issues:'issues','issue-freedom':'kirk-evers',
 'issue-repair':'garden','issue-opportunity':'cornerstone',
 volunteer:'volunteer',donate:'donate',notices:'notices'
});
const templates=new Map();
export function renderCampaignDraftPage(document,page='home',appearance='default'){
 if(!['default','day','night'].includes(appearance))campaignFailure('invalid_preview_mode','Unsupported preview appearance.');
 if(typeof page!=='string'||!Object.hasOwn(ROUTES,page))campaignFailure('invalid_page','Choose a supported website page.');
 const name=ROUTES[page];
 if(!Object.hasOwn(CAMPAIGN_PAGE_KEYS,name))campaignFailure('invalid_page','Unsupported website route.');
 if(!templates.has(name))templates.set(name,compileCampaignTemplate(renderPage(name),name));
 const projected=publicCampaignDocument(document);
 const html=renderCampaignTemplate(templates.get(name),projected,{css:CAMPAIGN_PRESENTATION_CSS,mode:appearance,preference:'system',modeEnabled:false,path:'/'});
 // These are trusted checked-in static paths only, never editor-supplied URLs.
 return html.replace(/((?:src|href)=")\/assets\/([A-Za-z0-9_.-]+\.(?:css|svg|png|jpg|jpeg|webp|avif|woff2))"/gi,
   (_whole,prefix,file)=>prefix+'/editor/campaigns/preview-assets/'+file+'"')
   .replace(/(src=")\/campaign-media\/([0-9a-f-]{36})\.png"/gi,
     (_whole,prefix,id)=>prefix+'/api/editorial/media/'+id+'"');
}

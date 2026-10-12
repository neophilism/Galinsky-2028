import {origin,assert} from '../../../packages/core/validation.mjs';
import {loadPreviewGate} from '../../../packages/core/preview-gate.mjs';
export function loadConfig(env=process.env){
 const production=env.NODE_ENV==='production';
 assert(env.RENDER!=='true'||production,'production_runtime','Render API deployments require NODE_ENV=production.',503);
 const previewGate=production||env.RENDER==='true'?loadPreviewGate(env):null;
 const publicOrigin=origin(env.PUBLIC_ORIGIN||'http://localhost:4321',!production);
 const portalOrigin=origin(env.PORTAL_ORIGIN||'http://localhost:4322',!production);
 assert(!production||publicOrigin!==portalOrigin,'origin_separation','Public and protected applications require separate origins.',503);
 const deliveryKey=env.DELIVERY_KEY||'';const pepper=env.LOGIN_PEPPER||'';
 const mailReady=env.MAIL_PROVIDER==='resend'&&Boolean(env.RESEND_API_KEY&&env.MAIL_FROM&&/^[^\r\n]+@[^\r\n]+$/.test(env.MAIL_FROM));
 const signup=env.SIGNUP_ENABLED==='true';
 const mailDeliveryMode=env.MAIL_DELIVERY_MODE||'disabled';
 assert(['disabled','inline','external'].includes(mailDeliveryMode),'invalid_mail_delivery','Select disabled, inline or external mail delivery.',503);
 if(production&&signup){
  assert(mailDeliveryMode==='inline'||(mailDeliveryMode==='external'&&env.MAIL_WORKER_OPERATIONAL_APPROVED==='true'),
   'mail_worker_unavailable','Production sign-in cannot open without a configured, operational mail delivery worker.',503);
 }
 if(signup){assert(deliveryKey&&Buffer.from(deliveryKey,'base64').length===32&&pepper.length>=32&&mailReady,'signup_unready','Account delivery and authentication configuration are incomplete.',503);}
 // These flags may not bypass missing reviewed adapters or release evidence.
 assert(env.PROTECTED_CONTENT_ENABLED!=='true','protected_unavailable','A reviewed protected-content implementation is not installed.',503);
 assert(env.STAFF_IDENTITY_ENABLED!=='true','staff_unavailable','A reviewed staff identity integration is not installed.',503);
 assert(env.DONATIONS_ENABLED!=='true','fundraising_unavailable','A production fundraising adapter and release evidence are not installed.',503);
 if(production)assert(env.DATABASE_URL,'database_required','Production requires the assigned database.',503);
 return {production,previewGate,publicOrigin,portalOrigin,deliveryKey,pepper,signup,mailReady,mailDeliveryMode,mailKey:env.RESEND_API_KEY,mailFrom:env.MAIL_FROM,databaseUrl:env.DATABASE_URL,port:Number(env.PORT||4322),host:env.HOST||(production?'0.0.0.0':'127.0.0.1'),termsVersion:'2026-10-10'};
}

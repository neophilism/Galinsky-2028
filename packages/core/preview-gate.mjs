import {createHash,timingSafeEqual} from 'node:crypto';

export const PREVIEW_REALM='Basic realm="Galinsky 2028 private preview", charset="UTF-8"';
export const PREVIEW_ROBOTS='noindex, nofollow, noarchive';

const digest=value=>createHash('sha256').update(value,'utf8').digest();

// This must be configured in Render as a secret, never committed to Git.
// Not setting a password is a startup failure, never an open-preview default.
export function loadPreviewGate(env=process.env){
 const username=env.PREVIEW_ACCESS_USER||'preview';
 const password=env.PREVIEW_ACCESS_PASSWORD;
 if(typeof username!=='string'||!/^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(username))throw Error('Invalid private preview username.');
 if(typeof password!=='string'||password.length<24||password.length>256||/[\x00-\x1f\x7f]/.test(password))throw Error('PREVIEW_ACCESS_PASSWORD must be a 24-256 character Render secret.');
 return Object.freeze({userHash:digest(username),passwordHash:digest(password)});
}

// A simple HTTP Basic authentication barrier for an HTTPS-only private preview.
// This is NOT volunteer identity, E2EE, staff authentication, or a public launch.
export function previewAuthorized(header,gate){
 if(!gate||typeof header!=='string'||header.length>1024||!header.startsWith('Basic '))return false;
 const encoded=header.slice(6);
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return false;
 const bytes=Buffer.from(encoded,'base64');
 if(bytes.toString('base64')!==encoded||bytes.length>400)return false;
 const text=bytes.toString('utf8'),at=text.indexOf(':');
 if(at<1)return false;
 const u=digest(text.slice(0,at)),p=digest(text.slice(at+1));
 const uOkay=timingSafeEqual(u,gate.userHash),pOkay=timingSafeEqual(p,gate.passwordHash);
 return Boolean(uOkay & pOkay);
}

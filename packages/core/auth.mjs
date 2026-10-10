import {randomBytes,createHash,createHmac,createCipheriv,createDecipheriv} from 'node:crypto';
import {assert} from './validation.mjs';
export const randomToken=()=>randomBytes(32).toString('base64url');
export const tokenHash=t=>createHash('sha256').update(t).digest('hex');
export const emailKey=(email,pepper)=>createHmac('sha256',pepper).update(email).digest('hex');
export const validToken=t=>typeof t==='string'&&/^[A-Za-z0-9_-]{43}$/.test(t);
/** Server-processed delivery metadata only. This is deliberately NOT called E2EE. */
export function sealDelivery(value,key){const k=Buffer.from(key,'base64');assert(k.length===32,'delivery_key','A 32-byte delivery key is required.',503);const iv=randomBytes(12);const c=createCipheriv('aes-256-gcm',k,iv);c.setAAD(Buffer.from('g28:delivery:v1'));const ciphertext=Buffer.concat([c.update(JSON.stringify(value),'utf8'),c.final()]);return ['v1',iv.toString('base64url'),c.getAuthTag().toString('base64url'),ciphertext.toString('base64url')].join('.');}
export function openDelivery(envelope,key){const [v,n,t,body]=envelope.split('.');assert(v==='v1'&&n&&t&&body,'invalid_envelope','Invalid delivery envelope.',500);const d=createDecipheriv('aes-256-gcm',Buffer.from(key,'base64'),Buffer.from(n,'base64url'));d.setAAD(Buffer.from('g28:delivery:v1'));d.setAuthTag(Buffer.from(t,'base64url'));return JSON.parse(Buffer.concat([d.update(Buffer.from(body,'base64url')),d.final()]).toString('utf8'));}
export function sessionCookie(token,{secure=true,maxAge=86400}={}){return `${secure?'__Host-g28':'g28-local'}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure?'; Secure':''}`;}
export function readCookie(header,name){return (header||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)||null;}

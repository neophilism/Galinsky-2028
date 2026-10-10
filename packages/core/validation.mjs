/** Shared validation. These routines make no external requests and never infer political preferences. */
export class DomainError extends Error {
  constructor(code, message, status=400) { super(message); this.name='DomainError'; this.code=code; this.status=status; }
}
export const assert = (condition, code, message, status=400) => {if(!condition) throw new DomainError(code,message,status);};
export function email(value) {
  assert(typeof value==='string' && value.length<=254,'invalid_email','Enter a valid email address.');
  const v=value.trim(); assert(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v),'invalid_email','Enter a valid email address.');
  // Preserve the local part. Domain names are case-insensitive; mailboxes need not be.
  return v.slice(0,v.lastIndexOf('@'))+'@'+v.slice(v.lastIndexOf('@')+1).toLowerCase();
}
export function id(value) {assert(typeof value==='string' && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(value),'invalid_id','Invalid identifier.');return value;}
export function safeText(value,max=5000) {assert(typeof value==='string' && value.length<=max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),'invalid_text','Invalid text.');return value;}
export function origin(value,allowLocal=false) {
  let u; try{u=new URL(value);}catch{throw new DomainError('invalid_origin','A valid origin is required.');}
  assert(!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/'&&(u.protocol==='https:'||(allowLocal&&u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname))),'invalid_origin','A secure origin is required.');
  return u.origin;
}
export function httpsUrl(value) {let u;try{u=new URL(value);}catch{throw new DomainError('invalid_url','Enter an HTTPS URL.');}assert(u.protocol==='https:'&&!u.username&&!u.password,'invalid_url','Enter an HTTPS URL.');return u.toString();}
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function exactKeys(value, keys) {assert(value&&typeof value==='object'&&!Array.isArray(value),'invalid_body','Expected an object.');assert(Object.keys(value).every(k=>keys.includes(k)),'unknown_field','An unsupported field was supplied.');return value;}

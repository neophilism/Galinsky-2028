import {readFileSync,statSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {assert,escapeHtml} from './validation.mjs';

// These documents are PUBLIC policy resources, never the unreviewed volunteer archive.
// Publication requires reviewed metadata and immutable asset-content matching.
const kinds={
 bill:{title:'Kirk–Evers bill text',subtitle:'Approved bill publication'},
 summary:{title:'Plain-language summary',subtitle:'Purpose, key provisions and safeguards'},
 supporting:{title:'Supporting documents',subtitle:'Approved explanatory and source materials'}
};
export function publishedPolicyDocuments(slug,items,publicDir){
 assert(slug==='kirk-evers','invalid_issue','The local publication reader is available only for Kirk–Evers.');
 assert(Array.isArray(items)&&items.length<=20,'invalid_documents','Document list must contain at most 20 records.');
 const root=resolve(publicDir),ids=new Set(),paths=new Set(),result=[];
 for(const d of items){
  assert(d&&typeof d==='object'&&!Array.isArray(d),'invalid_document','Each document must be a record.');
  assert(typeof d.id==='string'&&/^[a-z0-9][a-z0-9-]{1,79}$/.test(d.id)&&!ids.has(d.id),'invalid_document','Document IDs must be unique and safe.');
  ids.add(d.id);
  assert(d.status==='draft'||d.status==='published','invalid_document','Every document must declare draft or published status.');
  if(d.status==='draft')continue;
  assert(Object.hasOwn(kinds,d.kind),'invalid_document','Published document kind must be recognized.');
  assert(Number.isSafeInteger(d.revision)&&d.revision>=1,'invalid_document','Published document must have a positive revision.');
  assert(typeof d.label==='string'&&d.label.trim().length>=4&&d.label.length<=160,'invalid_document','Published document needs a readable label.');
  assert(typeof d.description==='string'&&d.description.length<=240,'invalid_document','Published document description is invalid.');
  assert(typeof d.author==='string'&&d.author.trim().length>=3,'invalid_document','A publication author must be recorded.');
  assert(d.review&&typeof d.review.approvedBy==='string'&&d.review.approvedBy.trim().length>=3&&d.review.approvedBy!==d.author&&d.review.revision===d.revision&&Number.isFinite(Date.parse(d.review.at)),'review_required','An independent approval for the exact published revision is required.');
  assert(typeof d.path==='string'&&/^\/documents\/kirk-evers-[a-z0-9-]{2,90}\.(?:pdf|html|txt)$/.test(d.path)&&!paths.has(d.path),'invalid_document_path','Use a unique, campaign-hosted document filename.');
  paths.add(d.path);
  const asset=resolve(root,d.path.slice(1));
  assert(asset.startsWith(root+sep),'invalid_document_path','Document path escapes the approved asset root.');
  const size=statSync(asset).size;
  assert(size>0&&size<=12*1024*1024,'invalid_document_size','Document is empty or too large.');
  const bytes=readFileSync(asset);
  const digest=createHash('sha256').update(bytes).digest('hex');
  assert(typeof d.sha256==='string'&&/^[a-f0-9]{64}$/.test(d.sha256)&&d.sha256===digest,'document_hash_mismatch','The approved content digest does not match this file.');
  if(d.path.endsWith('.html')){
   const html=bytes.toString('utf8');
   assert(html.includes('name="generator" content="g28-safe-document-v1"')&&html.includes('http-equiv="Content-Security-Policy"')&&!/<(?:script|iframe|object|embed|form|svg)\b/i.test(html),'unsafe_html','HTML publication must be produced with the approved safe-document generator.');
  }
  result.push(d);
 }
 return result;
}

export function policyDocumentSection(slug,items,publicDir){
 const published=publishedPolicyDocuments(slug,items,publicDir);
 const slots=Object.entries(kinds).map(([kind,meta])=>{
  const docs=published.filter(d=>d.kind===kind);
  if(!docs.length)return `<div class="resource"><span>${escapeHtml(meta.title)}<small>${escapeHtml(meta.subtitle)}</small></span><span class="pending">AWAITING<br>APPROVED FILE</span></div>`;
  return docs.map(d=>`<a class="resource resource-link" href="${escapeHtml(d.path)}" title="${escapeHtml(d.label)}"><span>${escapeHtml(d.label)}<small>${escapeHtml(d.description||meta.subtitle)}</small></span><span class="resource-format">${d.path.split('.').pop().toUpperCase()} &darr;</span></a>`).join('');
 }).join('');
 return slots+'<p class="tiny policy-document-status">Only approved publication editions appear as links. A pending resource is not available for download.</p>';
}

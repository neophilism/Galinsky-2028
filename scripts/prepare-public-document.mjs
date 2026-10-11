#!/usr/bin/env node
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {renderSafePolicyHtml} from '../packages/core/safe-policy-document.mjs';

const repoRoot=fileURLToPath(new URL('../',import.meta.url));
const outputRoot=join(repoRoot,'apps/web/public/documents');
export function preparePolicyFile({sourcePath,title,fileName,edition='Publication draft - pending review',write=false,publicDocumentsRoot=outputRoot}){
 if(typeof fileName!=='string'||!/^kirk-evers-[a-z0-9-]{2,90}-v[1-9][0-9]*\.html$/.test(fileName))throw Error('Output must be a versioned Kirk–Evers .html filename.');
 if(typeof sourcePath!=='string'||!['.md','.txt'].includes(extname(sourcePath).toLowerCase()))throw Error('Use a reviewed .md or .txt source.');
 const buf=readFileSync(resolve(sourcePath));
 if(buf.length>200000||buf.length===0)throw Error('Source must be between 1 byte and 200 KB.');
 const source=buf.toString('utf8');
 if(!Buffer.from(source,'utf8').equals(buf))throw Error('Invalid UTF-8 source.');
 const html=renderSafePolicyHtml({title,source,edition});
 const bytes=Buffer.from(html,'utf8'),sha256=createHash('sha256').update(bytes).digest('hex');
 if(write){mkdirSync(publicDocumentsRoot,{recursive:true});writeFileSync(join(publicDocumentsRoot,fileName),bytes,{flag:'wx'});}
 return {fileName,bytes:bytes.length,sha256,wrote:write};
}
export function args(argv){
 const out={write:false};
 const fields=new Set(['--source','--title','--filename','--edition']);
 for(let i=0;i<argv.length;i++){
  const key=argv[i];if(key==='--write'){if(out.write)throw Error('Duplicate --write');out.write=true;continue;}
  if(!fields.has(key)||argv[i+1]===undefined||argv[i+1].startsWith('--'))throw Error('Unknown or incomplete option: '+key);
  const name=key.slice(2);if(Object.hasOwn(out,name))throw Error('Duplicate option '+key);
  out[name]=argv[++i];
 }
 for(const k of ['source','title','filename'])if(!out[k])throw Error('Required: --'+k);
 return out;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const p=args(process.argv.slice(2));
  const result=preparePolicyFile({sourcePath:p.source,title:p.title,fileName:p.filename,edition:p.edition,write:p.write});
  console.log((p.write?'CREATED UNPUBLISHED DOCUMENT':'DRY RUN ONLY')+': '+result.fileName);
  console.log('SHA-256 '+result.sha256+' ('+result.bytes+' bytes)');
  console.log('This step does not modify site.json, establish editorial approval or deploy the site. Approval metadata is separately required.');
 }catch(e){console.error(e.message);process.exitCode=1;}
}

import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=join(root,'content/materials/source-edition-1');
const manifest=JSON.parse(readFileSync(join(root,'content/materials/archive-manifest.json'),'utf8'));
if(manifest.length!==36)throw Error('The complete 36-item historical manifest must remain intact.');
const checks=[];
for(const doc of manifest){
 if(doc.status!=='unreviewed'||doc.review!==null)throw Error('An archival item has been incorrectly published: '+doc.id);
 if(doc.compiled){if(doc.id!=='35')throw Error('Unexpected compiled item');continue;}
 const path=join(source,doc.source.filename);
 if(!existsSync(path))throw Error('Historical source copy missing: '+doc.source.filename);
 const content=readFileSync(path);
 if(content.length<100||!content.toString('utf8').startsWith('# '))throw Error('Invalid historical source: '+doc.source.filename);
 const sha256=createHash('sha256').update(content).digest('hex');
 checks.push({id:doc.id,filename:doc.source.filename,sourceHashMatches:sha256===doc.source.sha256,
  importedSha256:sha256,originalSha256:doc.source.sha256});
}
if(checks.length!==35)throw Error('Expected 35 non-compiled originals.');
const matches=checks.filter(c=>c.sourceHashMatches).length;
console.log(JSON.stringify({edition:'September 2026',imported:checks.length,
 exactByteHashMatches:matches,normalizedParsedCopies:checks.length-matches,
 publicationStatus:'UNREVIEWED_SOURCE_ONLY',
 originalSourceLocation:'Owner file Library; canonical manifest hashes preserved',
 files:checks},null,2));

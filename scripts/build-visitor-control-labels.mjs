// Build-only: attach public, static control names to anonymous ordinal metrics.
// No visitor content, private account data, URLs or form values enter this map.
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pages,renderPage} from './public-renderer.mjs';

const clean=text=>text
 .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
 .replace(/<[^>]*>/g,' ')
 .replace(/&nbsp;|&#160;/gi,' ')
 .replace(/&amp;/gi,'&')
 .replace(/&quot;/gi,'"')
 .replace(/&#39;|&apos;/gi,"'")
 .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
 .replace(/\s+/g,' ').trim().slice(0,140);
const attr=(text,name)=>{
 const match=text.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"','i'));
 return match?.[1]||'';
};
const rows=(html,tag)=>[...html.matchAll(new RegExp('<'+tag+'\\b([^>]*)>([\\s\\S]*?)<\\/'+tag+'>','gi'))];
function name(attributes,inside,fallback){
 // Labels are from reviewed *published* templates, never a user's entered text.
 return clean(attr(attributes,'aria-label')||inside)||fallback;
}
const output={};
for(const page of pages){
 const html=renderPage(page.key);
 const labels={};
 const links=rows(html,'a').filter(match=>/(\s|^)href=/i.test(match[1]));
 links.forEach((match,i)=>{labels['l'+(i+1)]=name(match[1],match[2],'Link '+(i+1));});
 const buttons=rows(html,'button');
 buttons.forEach((match,i)=>{labels['b'+(i+1)]=name(match[1],match[2],'Button '+(i+1));});
 const main=html.split(/<main\b[^>]*>/i)[1]?.split(/<\/main>/i)[0]||'';
 const details=[...main.matchAll(/<details\b[^>]*>[\s\S]*?<summary\b[^>]*>([\s\S]*?)<\/summary>/gi)];
 details.forEach((match,i)=>{labels['a'+(i+1)]=clean(match[1])||'Accordion '+(i+1);});
 output[page.path]=labels;
}
const filename=resolve('apps/portal/src/visitor-control-labels.json');
writeFileSync(filename,JSON.stringify(output,null,2)+'\n');
console.log('Built public-only control labels for '+pages.length+' campaign pages.');

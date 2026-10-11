// Deliberately restricted Markdown presentation. Text is rendered as React text,
// never HTML; URLs/HTML from volunteer material are not executed.
export function parseMaterialMarkdown(value){
 if(typeof value!=='string'||value.length>100000)throw Error('Material body is invalid or too long');
 const lines=value.replace(/\r\n?/g,'\n').split('\n');
 const blocks=[],headings=[],counts=new Map();
 const heading=/^ {0,3}(#{1,3})\s+(.+?)\s*#*\s*$/;
 const bullet=/^ {0,2}[-*+]\s+(.+)$/;
 const number=/^ {0,2}\d+[.)]\s+(.+)$/;
 const quote=/^ {0,3}>\s?(.*)$/;
 const fence=/^ {0,3}```/;
 const rule=/^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
 const splitCells=line=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(x=>x.trim());
 const isTable=i=>i+1<lines.length&&lines[i].trim().includes('|')&&lines[i+1].trim().includes('|')&&splitCells(lines[i+1]).every(x=>/^:?-{3,}:?$/.test(x));
 const isStart=(line,index)=>heading.test(line)||fence.test(line)||rule.test(line)||bullet.test(line)||number.test(line)||quote.test(line)||isTable(index);
 let i=0;
 while(i<lines.length){
  const line=lines[i];if(!line.trim()){i++;continue;}
  const h=heading.exec(line);
  if(h){let text=h[2].trim();let slug=text.toLocaleLowerCase('en').normalize('NFKD').replace(/[^\p{Letter}\p{Number}]+/gu,'-').replace(/^-|-$/g,'').slice(0,80)||'section';const count=(counts.get(slug)||0)+1;counts.set(slug,count);if(count>1)slug+='-'+count;
   const block={type:'heading',level:h[1].length,id:slug,text};blocks.push(block);headings.push({id:slug,level:block.level,text});i++;continue;}
  if(fence.test(line)){i++;const text=[];while(i<lines.length&&!fence.test(lines[i]))text.push(lines[i++]);if(i<lines.length)i++;blocks.push({type:'code',text:text.join('\n')});continue;}
  if(rule.test(line)){blocks.push({type:'rule'});i++;continue;}
  if(isTable(i)){
   const headers=splitCells(lines[i]);i+=2;const rows=[];
   while(i<lines.length&&lines[i].trim().startsWith('|')&&lines[i].trim().includes('|')){const cells=splitCells(lines[i]);rows.push(headers.map((_,j)=>cells[j]||''));i++;}
   blocks.push({type:'table',headers,rows});continue;
  }
  let match=bullet.exec(line);if(match){const items=[];while(i<lines.length&&(match=bullet.exec(lines[i]))){items.push(match[1]);i++;}blocks.push({type:'ul',items});continue;}
  match=number.exec(line);if(match){const items=[];while(i<lines.length&&(match=number.exec(lines[i]))){items.push(match[1]);i++;}blocks.push({type:'ol',items});continue;}
  match=quote.exec(line);if(match){const items=[];while(i<lines.length&&(match=quote.exec(lines[i]))){items.push(match[1]);i++;}blocks.push({type:'quote',text:items.join('\n')});continue;}
  const para=[];
  while(i<lines.length&&lines[i].trim()&&(!para.length||!isStart(lines[i],i))){para.push(lines[i]);i++;}
  blocks.push({type:'paragraph',text:para.join('\n')});
 }
 return {blocks,headings};
}

// Parse only safe inline Markdown links. Everything else stays literal text.
export function materialLinks(text){
 if(typeof text!=='string')return [{type:'text',text:''}];
 const out=[],pattern=/\[([^\]\n]{1,150})\]\(([^\s)]+)\)/g;
 let last=0,match;
 for(; (match=pattern.exec(text))!==null;){
  const raw=match[0],href=match[2],label=match[1];
  let destination=null,external=false;
  if(href.startsWith('/')&&!href.startsWith('//')&&!href.includes('\\')&&!href.includes('..'))destination=href;
  else try{const url=new URL(href);if(url.protocol==='https:'&&!url.username&&!url.password&&!url.port){destination=url.href;external=true;}}catch{}
  if(!destination)continue;
  if(match.index>last)out.push({type:'text',text:text.slice(last,match.index)});
  out.push({type:'link',text:label,url:destination,external});last=match.index+raw.length;
 }
 if(last<text.length||!out.length)out.push({type:'text',text:text.slice(last)});
 return out;
}

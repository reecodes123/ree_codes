import fs from 'node:fs';
import sharp from 'sharp';
const {columns,keys,links}=JSON.parse(fs.readFileSync('docs/normalization/database-metadata.json','utf8'));
const selected={users:['id','email','displayName','passwordHash','role'],categories:['id','name','slug','description'],articles:['id','title','content','status','publishedAt','createdAt','updatedAt','slug','authorId','categoryId'],media_assets:['id','url','fileName','mimeType','sizeBytes','uploadedById']};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const text=(x,y,s,z=17,b=false)=>`<text x="${x}" y="${y}" font-size="${z}" font-weight="${b?'bold':'normal'}">${esc(s)}</text>`;
const flag=(t,c)=>[keys.some(k=>k.table_name===t&&k.column_name===c&&k.constraint_type==='PRIMARY KEY')?'PK':'',links.some(l=>l.table_name===t&&l.column_name===c)?'FK':''].filter(Boolean).join(', ');
for(const stage of ['1NF','2NF','3NF']){
 const W=2600,H=stage==='1NF'?720:1000;
 const parts=[text(50,75,stage,54,true)];
 function strip(items,x,y,qualified=false){let left=x;const centers=[];
  for(const {t,c} of items){
   const w=qualified?155:Math.max(116,c.length*10+22),f=flag(t,c);centers.push(left+w/2);
   parts.push(`<rect x="${left}" y="${y}" width="${w}" height="85" fill="#fce6cf" stroke="#f4b183"/>`);
   if(qualified)parts.push(text(left+8,y+21,t,13));
   parts.push(text(left+8,y+(qualified?47:35),c,18,true));
   if(f)parts.push(text(left+8,y+70,`(${f})`,16,true));
   left+=w;
  }
  // Each entity block uses its own actual primary key as dependency determinant.
  let start=0;
  while(start<items.length){let end=start+1;while(end<items.length&&items[end].t===items[start].t)end++;
   const key=items.findIndex((it,i)=>i>=start&&i<end&&flag(it.t,it.c).includes('PK'));
   if(key>=0&&end-start>1){const base=y+112;parts.push(`<path d="M ${centers[key]} ${y+85} V ${base} H ${centers[end-1]}" stroke="#111" fill="none" stroke-width="2"/>`);for(let i=start;i<end;i++)if(i!==key)parts.push(`<path d="M ${centers[i]} ${base} V ${y+88}" stroke="#111" fill="none" stroke-width="2" marker-end="url(#arrow)"/>`);}
   start=end;
  }
 }
 if(stage==='1NF'){
  const list=Object.entries(selected).flatMap(([t,cs])=>cs.map(c=>({t,c})));
  for(let i=0;i<list.length;i+=15){const y=190+Math.floor(i/15)*195;parts.push(text(50,y-20,i?'Article System_1NF_Continuation':'Article System_1NF',22,true));strip(list.slice(i,i+15),50,y,true);}
 }else{
  const locations={users:[50,195],categories:[50,430],articles:[50,665],media_assets:[1480,195]};
  for(const [t,cs]of Object.entries(selected)){const [x,y]=locations[t];parts.push(text(x,y-22,t.toUpperCase(),25,true));strip(cs.map(c=>({t,c})),x,y);}
 }
 parts.push(text(50,H-90,'Simplified publication view: selected columns from 4 current PostgreSQL tables; supporting tables and other columns are omitted.',19),text(50,H-57,'PK = declared primary key | FK = enforced foreign key | 2NF and 3NF preserve the same implemented keys and table separation.',19),text(50,H-24,'This is a focused dependency illustration, not a complete physical schema or an unconditional normalization certification.',19));
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7" fill="none" stroke="#111"/></marker></defs><rect width="100%" height="100%" fill="white"/><rect x="25" y="110" width="${W-50}" height="${H-125}" fill="none" stroke="#ff7900" stroke-width="4"/><g font-family="Arial,sans-serif">${parts.join('')}</g></svg>`;
 fs.writeFileSync(`docs/normalization/${stage}-compact.svg`,svg);
 await sharp(Buffer.from(svg)).png().toFile(`docs/normalization/${stage}-compact.png`);
}
console.log('Generated compact 1NF, 2NF and 3NF figures.');

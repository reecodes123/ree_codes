import fs from 'node:fs';
import sharp from 'sharp';
const {columns,keys,links}=JSON.parse(fs.readFileSync('docs/normalization/database-metadata.json','utf8'));
const order=['users','categories','articles','media_assets','article_revisions','positions','board_members','activity_logs','feedback','daily_visits','website_settings','about_page','terms_page','accounts','sessions','verification_tokens'];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const tx=(x,y,s,z=18,b=false)=>`<text x="${x}" y="${y}" font-size="${z}" font-weight="${b?'bold':'normal'}">${esc(s)}</text>`;
const ispk=(t,c)=>keys.some(k=>k.table_name===t&&k.column_name===c&&k.constraint_type==='PRIMARY KEY');
const isfk=(t,c)=>links.some(k=>k.table_name===t&&k.column_name===c);
const width=c=>Math.max(105,c.column_name.length*9+22);
const W=3650;
for(const stage of ['1NF','2NF','3NF']){
 const parts=[tx(35,65,stage,54,true)];const tracks=[160,160];let row=0;
 for(const [idx,t] of order.entries()){
  const side=stage==='1NF'?0:idx<8?0:1,x=48+side*1790,max=stage==='1NF'?W-110:1740;
  let y=tracks[side],groups=[],batch=[],used=0;
  for(const c of columns.filter(c=>c.table_name===t)){
   if(used+width(c)>max&&batch.length){groups.push(batch);batch=[];used=0;}
   batch.push(c);used+=width(c);
  }if(batch.length)groups.push(batch);
  parts.push(tx(x,y-16,stage==='1NF'?`Article System_1NF${row?'_Continuation '+row:''} : ${t}`:t.toUpperCase(),22,true));
  let root;
  for(const cs of groups){
   let left=x;const targets=[];
   cs.forEach(c=>{
    const w=width(c),pk=ispk(t,c.column_name),fk=isfk(t,c.column_name);
    parts.push(`<rect x="${left}" y="${y}" width="${w}" height="70" fill="#fce6cf" stroke="#f4b183"/>`,tx(left+8,y+29,c.column_name,16,true));
    const tag=[pk?'PK':'',fk?'FK':''].filter(Boolean).join(', ');
    if(tag)parts.push(tx(left+8,y+53,`(${tag})`,14,true));
    if(pk)root=left+w/2;else targets.push(left+w/2);
    left+=w;
   });
   if(root!==undefined&&targets.length){
    const base=y+100;
    // Continuation strips carry the same key dependency along the left margin.
    parts.push(`<path d="M ${root} ${y+70} V ${base} H ${Math.max(root,...targets)}" fill="none" stroke="#111" stroke-width="1.5"/>`);
    targets.forEach(cx=>parts.push(`<path d="M ${cx} ${base} V ${y+73}" fill="none" stroke="#111" stroke-width="1.5" marker-end="url(#arrow)"/>`));
   }
   y+=130;row++;
  }
  tracks[side]=y+40;
 }
 const bottom=Math.max(...tracks),H=bottom+135;
 parts.push(tx(48,bottom+15,'Source: current PostgreSQL schema | PK = declared primary key; FK = enforced foreign key.',20),tx(48,bottom+48,'JSON collections are retained as implemented; full classical 3NF is not asserted. See REVISED-NORMALIZATION.md.',20),tx(48,bottom+81,'2NF and 3NF retain the same implemented tables and keys. Dependency arrows illustrate the intended key dependencies.',20));
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7" fill="none" stroke="#111"/></marker></defs><rect width="100%" height="100%" fill="white"/><rect x="30" y="105" width="${W-60}" height="${H-120}" fill="none" stroke="#ff7900" stroke-width="5"/><g font-family="Arial,sans-serif" fill="#111">${parts.join('')}</g></svg>`;
 fs.writeFileSync(`docs/normalization/${stage}-revised.svg`,svg);
 await sharp(Buffer.from(svg)).png().toFile(`docs/normalization/${stage}-revised.png`);
}
console.log('Rendered three figures matching the supplied horizontal table-strip style.');


import fs from 'node:fs';
import sharp from 'sharp';
const {columns,keys,links}=JSON.parse(fs.readFileSync('docs/normalization/database-metadata.json','utf8'));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const W=5700,H=8250,CW=1850,CH=1280;
const layout={accounts:[0,0],users:[1,0],sessions:[2,0],activity_logs:[0,1],articles:[1,1],media_assets:[2,1],board_members:[0,2],article_revisions:[1,2],categories:[2,2],positions:[0,3],feedback:[1,3],daily_visits:[2,3],website_settings:[0,4],about_page:[1,4],terms_page:[2,4],verification_tokens:[1,5]};
const pos=t=>[75+layout[t][0]*CW+CW/2,200+layout[t][1]*CH+CH/2];
const txt=(x,y,s,size=24,under=false)=>`<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}"${under?' text-decoration="underline"':''}>${esc(s)}</text>`;
const edges=[],nodes=[],diamonds=[];
const labels={accounts:'links account',sessions:'has session',activity_logs:'performs',articles:'authors',media_assets:'uploads',article_revisions:'has revision',categories:'categorizes',board_members:'links profile',positions:'assigns position'};
for(const [i,l] of links.entries()){
 const a=pos(l.parent),b=pos(l.table_name);
 const horizontal=layout[l.parent][1]===layout[l.table_name][1];
 let points,dx,dy;
 if(horizontal){
  const lane=200+layout[l.parent][1]*CH+CH-45-(i%2)*50;
  const ax=a[0]+(b[0]>a[0]?240:-240),bx=b[0]+(b[0]>a[0]?-240:240);
  points=[[ax,a[1]],[ax,lane],[bx,lane],[bx,b[1]]];dx=(ax+bx)/2;dy=lane;
 }else if(layout[l.parent][0]===layout[l.table_name][0]){
  const lane=75+layout[l.parent][0]*CW+CW-45;
  points=[[a[0]+240,a[1]],[lane,a[1]],[lane,b[1]],[b[0]+240,b[1]]];dx=lane;dy=(a[1]+b[1])/2;
 }else{
  const lane=200+Math.min(layout[l.parent][1],layout[l.table_name][1])*CH+CH-85;
  const ax=a[0]+(b[0]>a[0]?240:-240),bx=b[0]+(b[0]>a[0]?-240:240);
  points=[[ax,a[1]],[ax,lane],[bx,lane],[bx,b[1]]];dx=(ax+bx)/2;dy=lane;
 }
 edges.push(`<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#555" stroke-width="3"/>`);
 while(diamonds.some(d=>Math.abs(d[0]-dx)<330 && Math.abs(d[1]-dy)<135)){ if(horizontal || layout[l.parent][0]!==layout[l.table_name][0]) dx+=340; else dy+=145; }
 diamonds.push([dx,dy]);
 const nullable=columns.find(c=>c.table_name===l.table_name&&c.column_name===l.column_name)?.is_nullable==='YES';
 const childMax=l.table_name==='board_members'&&l.column_name==='userId'?'0..1':'0..M';
 const p0=points[0],pn=points.at(-1);
 edges.push(txt(p0[0],p0[1]-18,childMax,24),txt(pn[0],pn[1]-18,nullable?'0..1':'1',24));
 const name=l.table_name==='articles'&&l.column_name==='categoryId'?'categorizes':l.table_name==='board_members'&&l.column_name==='positionId'?'assigns position':labels[l.table_name];
 edges.push(`<polygon points="${dx},${dy-58} ${dx+150},${dy} ${dx},${dy+58} ${dx-150},${dy}" fill="#eee" stroke="#555" stroke-width="2"/>`,txt(dx,dy+7,name,21));
}
for(const t of Object.keys(layout)){
 const [cx,cy]=pos(t),cs=columns.filter(c=>c.table_name===t);
 // Attributes occupy upper and lower arcs, leaving an unobstructed horizontal entity corridor.
 cs.forEach((c,i)=>{
  const half=Math.ceil(cs.length/2),upper=i<half,j=upper?i:i-half,n=upper?half:cs.length-half;
  const angle=(j+0.5)/n*Math.PI;
  const ax=cx+720*Math.cos(angle),ay=cy+(upper?-1:1)*(170+300*Math.sin(angle));
  nodes.push(`<line x1="${cx}" y1="${cy}" x2="${ax}" y2="${ay}" stroke="#777" stroke-width="2"/>`);
  const pk=keys.some(k=>k.table_name===t&&k.column_name===c.column_name&&k.constraint_type==='PRIMARY KEY');
  const fk=links.some(k=>k.table_name===t&&k.column_name===c.column_name);
  nodes.push(`<ellipse cx="${ax}" cy="${ay}" rx="${Math.max(105,c.column_name.length*6.2+18)}" ry="36" fill="#eee" stroke="#666" stroke-width="2"/>`,txt(ax,ay+7,c.column_name,21,pk));
  if(fk)nodes.push(txt(ax,ay+25,'FK',13));
 });
 nodes.push(`<rect x="${cx-240}" y="${cy-48}" width="480" height="96" fill="#eee" stroke="#555" stroke-width="3"/>`,txt(cx,cy+9,t.toUpperCase(),29));
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#eee"/><rect x="25" y="25" width="${W-50}" height="${H-50}" fill="none" stroke="#ff7900" stroke-width="8"/><g font-family="Arial,sans-serif" fill="#222">${txt(W/2,100,'THE MATRIX TODAY — ENTITY RELATIONSHIP DIAGRAM',42)}${txt(W/2,150,'Current PostgreSQL database | 16 application tables | 9 enforced relationships',27)}${edges.join('')}${nodes.join('')}${txt(W/2,H-210,'Underlined attribute = declared primary key | FK = enforced foreign key | 0..M = zero or many',26)}${txt(W/2,H-160,'Numbers beside an entity state how many of that entity can relate to one entity at the opposite end.',25)}${txt(W/2,H-110,'Unconnected entities have no enforced foreign keys. JSON attributes are retained as implemented.',25)}${txt(W/2,H-60,'Metadata verified 2026-11-17. Unique indexes are not represented; verification_tokens has no declared primary key.',23)}</g></svg>`;
fs.writeFileSync('docs/erd/tmt-erd-chen.svg',svg);
await sharp(Buffer.from(svg)).png().toFile('docs/erd/tmt-erd-chen.png');
await sharp(Buffer.from(svg)).resize({width:1400}).png().toFile('docs/erd/tmt-erd-chen-preview.png');
console.log('Created Chen-style ERD: SVG, full PNG, and preview.');


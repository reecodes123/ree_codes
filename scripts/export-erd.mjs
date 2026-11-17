import fs from 'node:fs';
import pg from 'pg';
import sharp from 'sharp';

// Read schema metadata only; no application records or credentials are exported.
const line = fs.readFileSync('.env', 'utf8').split(/\r?\n/).find(l => /^\s*DATABASE_URL\s*=/.test(l));
const url = line.slice(line.indexOf('=') + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
const client = new pg.Client({ connectionString: url });
await client.connect();
let columns, keys, links;
try {
  columns = (await client.query(`SELECT table_name,column_name,is_nullable,udt_name,character_maximum_length FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`)).rows;
  keys = (await client.query(`SELECT tc.table_name,kcu.column_name,tc.constraint_type FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.constraint_schema=kcu.constraint_schema WHERE tc.table_schema='public' AND tc.constraint_type IN ('PRIMARY KEY','UNIQUE')`)).rows;
  keys.push(...(await client.query(`SELECT t.relname AS table_name,a.attname AS column_name,'UNIQUE' AS constraint_type FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=ANY(i.indkey) WHERE n.nspname='public' AND i.indisunique AND i.indnkeyatts=1`)).rows);
  links = (await client.query(`SELECT tc.table_name,kcu.column_name,ccu.table_name AS parent,ccu.column_name AS parent_column FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.constraint_schema=kcu.constraint_schema JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name AND tc.constraint_schema=ccu.constraint_schema WHERE tc.table_schema='public' AND tc.constraint_type='FOREIGN KEY' ORDER BY tc.table_name,kcu.column_name`)).rows;
} finally { await client.end(); }
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const tables = [...new Set(columns.map(c=>c.table_name))].filter(t=>t!=='_prisma_migrations');
const width=520, row=30, header=48;
const layout={accounts:[60,190],sessions:[60,730],activity_logs:[60,1020],users:[800,190],media_assets:[1540,190],board_members:[1540,600],positions:[2280,600],articles:[800,930],categories:[1540,1100],article_revisions:[800,1740]};
const connected = new Set(Object.keys(layout));
const independent=tables.filter(t=>!connected.has(t));
independent.forEach((t,i)=>layout[t]=[60+(i%4)*740,2330+Math.floor(i/4)*750]);
const W=2860,H=3950;
const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="white"/><style>text{font-family:Arial,sans-serif;fill:#172b4d}.title{font-size:38px;font-weight:bold}.name{font-size:25px;font-weight:bold;fill:white}.col{font-size:20px}.type{font-size:18px;fill:#526580}.small{font-size:21px}.edge{fill:none;stroke:#285e9c;stroke-width:3}</style>`];
const text=(x,y,s,cls='small')=>`<text x="${x}" y="${y}" class="${cls}">${esc(s)}</text>`;
parts.push(text(60,60,'THE MATRIX TODAY | Physical Entity–Relationship Diagram','title'),text(60,102,'PostgreSQL · public schema · 16 application tables · 9 enforced foreign keys'),text(60,140,'PK = primary key   FK = foreign key   UQ = unique column   ? = nullable   | = one   O = optional   crow’s foot = many'));
function endpoint(t,col,side){const [x,y]=layout[t];const list=columns.filter(c=>c.table_name===t);return [x+(side==='right'?width:0),y+header+row*(list.findIndex(c=>c.column_name===col)+.5)];}
links.forEach((l,i)=>{
 const parentRight=layout[l.parent][0]<layout[l.table_name][0];
 const ps=parentRight?'right':'left',cs=parentRight?'left':'right';
 const a=endpoint(l.parent,l.parent_column,ps),b=endpoint(l.table_name,l.column_name,cs);
 const dir=parentRight?1:-1;
 let mid=(a[0]+b[0])/2 + i*12;
 if(l.parent==='users' && parentRight)mid=1370+i*12;
 // Same-column links travel through an outside gutter.
 const same=layout[l.parent][0]===layout[l.table_name][0];
 if(same){a[0]=layout[l.parent][0]+width;b[0]=layout[l.table_name][0]+width;mid=1345+i*12;}
 parts.push(`<path class="edge" d="M ${a[0]} ${a[1]} H ${mid} V ${b[1]} H ${b[0]}"/>`);
 const ad=same?1:dir,bd=same?1:-dir;
 const bar=(p,d,n)=>`<path class="edge" d="M ${p[0]+d*n} ${p[1]-9} V ${p[1]+9}"/>`;
 const circle=(p,d,n)=>`<circle cx="${p[0]+d*n}" cy="${p[1]}" r="6" fill="white" stroke="#285e9c" stroke-width="3"/>`;
 const optional=columns.find(c=>c.table_name===l.table_name&&c.column_name===l.column_name).is_nullable==='YES';
 parts.push(bar(a,ad,12),optional?circle(a,ad,28):bar(a,ad,23));
 const unique=keys.some(k=>k.table_name===l.table_name&&k.column_name===l.column_name);
 if(unique)parts.push(bar(b,bd,12));else parts.push(`<path class="edge" d="M ${b[0]} ${b[1]-11} L ${b[0]+bd*19} ${b[1]} L ${b[0]} ${b[1]+11}"/>`);
 parts.push(circle(b,bd,30));
});
for(const t of tables){const [x,y]=layout[t],cols=columns.filter(c=>c.table_name===t);const h=header+cols.length*row;
 parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${h}" rx="5" fill="white" stroke="#a6b6cb" stroke-width="2"/><path d="M ${x} ${y} h ${width} v ${header} h -${width} Z" fill="${connected.has(t)?'#203f66':'#526579'}"/>`,text(x+16,y+33,t,'name'));
 cols.forEach((c,i)=>{const yy=y+header+i*row;const tags=[];if(keys.some(k=>k.table_name===t&&k.column_name===c.column_name&&k.constraint_type==='PRIMARY KEY'))tags.push('PK');if(links.some(l=>l.table_name===t&&l.column_name===c.column_name))tags.push('FK');if(!tags.includes('PK')&&keys.some(k=>k.table_name===t&&k.column_name===c.column_name&&k.constraint_type==='UNIQUE'))tags.push('UQ');let type=({int4:'integer',bool:'boolean',timestamp:'timestamp',timestamptz:'timestamptz'})[c.udt_name]||c.udt_name;if(c.character_maximum_length)type+=`(${c.character_maximum_length})`;if(i%2===0)parts.push(`<rect x="${x+1}" y="${yy}" width="${width-2}" height="${row}" fill="#f0f4f9"/>`);parts.push(text(x+10,yy+22,tags.join('/'),'type'),text(x+92,yy+22,c.column_name+(c.is_nullable==='YES'?' ?':''),'col'),`<text x="${x+width-12}" y="${yy+22}" text-anchor="end" class="type">${esc(type)}</text>`);});
}
parts.push(text(60,2240,'Independent tables · no declared foreign-key relationships','title'),text(60,2280,'These tables intentionally remain unconnected. Internal _prisma_migrations is omitted.'),text(60,3890,'Connections reflect database constraints only. article_revisions.editedById and activity_logs.targetId are not foreign keys.'),'</svg>');
fs.mkdirSync('docs/erd',{recursive:true});
const svg=parts.join('\n');fs.writeFileSync('docs/erd/tmt-erd.svg',svg);
await sharp(Buffer.from(svg)).png().toFile('docs/erd/tmt-erd.png');
fs.writeFileSync('docs/erd/relationships.json',JSON.stringify(links,null,2));
console.log(`Exported ${tables.length} tables and ${links.length} relationships to docs/erd`);

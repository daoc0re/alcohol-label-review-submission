/** Retain available notices from the installed package inventory. */
import {readdir,readFile,writeFile,realpath} from 'node:fs/promises';
import {join} from 'node:path';
const seen=new Set(),records=[];
async function scan(dir){
 for(const entry of await readdir(dir,{withFileTypes:true}).catch(()=>[])){
  if(entry.name.startsWith('.'))continue;
  const p=join(dir,entry.name);
  if(entry.name.startsWith('@')){await scan(p);continue;}
  let root;try{root=await realpath(p);if(seen.has(root))continue;seen.add(root);}catch{continue;}
  try{const metadata=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
   const names=(await readdir(root)).filter(n=>/^(?:licen[sc]e|notice|copying)(?:\.|$)/i.test(n));
   const notices=[];for(const n of names){try{notices.push(n+'\n'+await readFile(join(root,n),'utf8'));}catch{}}
   records.push({name:metadata.name,version:metadata.version,license:metadata.license,notices});
  }catch{}
 }
}
await scan('node_modules');
for(const entry of await readdir('node_modules/.pnpm').catch(()=>[]))await scan(join('node_modules/.pnpm',entry,'node_modules'));
records.sort((a,b)=>(a.name+'@'+a.version).localeCompare(b.name+'@'+b.version));
const content=['Installed package license inventory (including development tools). Not all listed packages are bundled. Missing upstream notice files are disclosed rather than invented.\n',...records.map(r=>`\n===== ${r.name}@${r.version} (${JSON.stringify(r.license??'unspecified')}) =====\n${r.notices.length?r.notices.join('\n'):'No separate notice file shipped at the installed package root. Consult upstream.'}`)].join('\n');
await writeFile('public/THIRD_PARTY_LICENSES.txt',content);console.log(`Retained notices for ${records.length} installed packages.`);

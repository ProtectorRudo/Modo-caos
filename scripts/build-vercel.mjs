/* Static publishing for the shared Modo Caos Vercel project.
 * Keep all playable games and their public artwork, but never expose
 * workflows, tests, docs, private configs or dotfiles.
 */
import {readdir,copyFile,mkdir,lstat} from 'node:fs/promises';
import {join,extname,relative} from 'node:path';
const cwd=process.cwd(),output=join(cwd,'public');
const EXT=new Set(['.html','.js','.mjs','.css','.png','.jpg','.jpeg','.webp','.avif','.svg',
 '.glb','.gltf','.bin','.ktx2','.hdr','.basis','.wasm','.mp3','.ogg','.wav','.woff','.woff2']);
const EXTRAS=new Set(['LICENSE.txt','manifest.json']);
const allowed=(name)=>!name.startsWith('.')&&!/secret|credential|token|private|\.map$|\.env/i.test(name) &&
 (EXT.has(extname(name).toLowerCase())||EXTRAS.has(name));
async function copySafe(source,dest){
 for(const entry of await readdir(source,{withFileTypes:true})){
  if(entry.name.startsWith('.')||entry.isSymbolicLink())continue;
  const input=join(source,entry.name),target=join(dest,entry.name);
  const st=await lstat(input);
  if(st.isSymbolicLink())continue;
  if(st.isDirectory()){
   if(!['assets'].includes(entry.name)&&source===cwd)continue;
   await mkdir(target,{recursive:true});await copySafe(input,target);
  }else if(st.isFile()&&allowed(entry.name)){
   await mkdir(dest,{recursive:true});await copyFile(input,target);
  }
 }
}
await mkdir(output,{recursive:true});
let count=0;
for(const entry of await readdir(cwd,{withFileTypes:true})){
 if(!entry.isFile()||!allowed(entry.name))continue;
 await copyFile(join(cwd,entry.name),join(output,entry.name));count++;
}
await copySafe(join(cwd,'assets'),join(output,'assets'));
const {access}=await import('node:fs/promises');
for(const required of ['index.html','paper.html','paper-3d.mjs','paper-ultra.css',
 'assets/styloo/ninja.glb','assets/styloo/archer.glb','assets/styloo/student.glb',
 'assets/styloo/merchant.glb','assets/styloo/knight.glb']){
 await access(join(output,required));
}
console.log('CIVIDOM safe Vercel build validated; root game files:',count,'target:',relative(cwd,output));

/* MINI WORLDS bundled-asset integrity checks. Run: node tests/mini-worlds-assets.test.cjs */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const BASE=path.join(__dirname,'..','assets','mini-worlds','kenney');
const names=[
 'tree-palmdetailedtall','tree-palmbend','tree-palmshort','tree-detailed',
 'plant-bushdetailed','grass-leafslarge','flower-yellowb','rock-largea',
 'rock-tallb','stone-largeb','cliff-waterfall-rock','bridge-woodround',
 'canoe','campfire-stones','crate','crate-strong','coin-gold','star','chest'
];
let bytes=0;
for(const name of names){
 const file=path.join(BASE,name+'.glb');
 assert.ok(fs.existsSync(file),name+' missing');
 const data=fs.readFileSync(file);bytes+=data.length;
 assert.ok(data.length>=1000,name+' too small');
 assert.equal(data.toString('ascii',0,4),'glTF',name+' has invalid glTF header');
 assert.equal(data.readUInt32LE(4),2,name+' is not binary glTF v2');
 assert.equal(data.readUInt32LE(8),data.length,name+' incorrect GLB length');
}
assert.equal(fs.readdirSync(BASE).filter(n=>n.endsWith('.glb')).length,names.length);
const html=fs.readFileSync(path.join(__dirname,'..','mini-worlds.html'),'utf8');
const runtime=fs.readFileSync(path.join(__dirname,'..','mini-worlds-runtime.js'),'utf8');
const art=fs.readFileSync(path.join(__dirname,'..','mini-worlds-assets.js'),'utf8');
assert.ok(html.includes('mini-worlds-assets.js'));
assert.ok(html.includes('type="importmap"'));
assert.ok(runtime.includes('MiniWorldsAssets(T).decorate'));
const excluded=['tree-palmdetailedtall','tree-palmbend','tree-palmshort','tree-detailed'];
for(const name of names.filter(n=>!excluded.includes(n)))
 assert.ok(art.includes("'"+name+"'"),name+' should be available to the scene loader');
for(const name of excluded)
 assert(!art.includes("'"+name+"'"),'toy-like giant-tree mesh must never load in AR: '+name);
console.log('MINI WORLDS assets: '+names.length+' valid CC0 GLB files ('+bytes+' bytes), wired to renderer.');

"""CUADRANTE vendored asset quality gate; no external network or dependency."""
from pathlib import Path, PurePosixPath
import json, hashlib, re
ROOT=Path('assets/cuadrante')
M=json.loads((ROOT/'manifest.json').read_text('utf-8'))
assert M['license']=='CC0-1.0'
assert len(M['models'])==11 and len(M['audio'])==8 and len(M['pbr'])==4
files=list(ROOT.rglob('*'))
assert sum(p.stat().st_size for p in files if p.is_file())<12*1024*1024
for key,model in M['models'].items():
 path=ROOT/model['url'];assert path.is_file(),path
 doc=json.loads(path.read_text('utf-8'))
 assert doc['asset']['version'].startswith('2.'),(key,doc.get('asset'))
 for d in doc.get('images',[])+doc.get('buffers',[]):
  uri=d.get('uri','')
  if not uri or uri.startswith('data:'):continue
  assert not uri.startswith('/') and '://' not in uri,uri
  abs=(path.parent/uri).resolve()
  assert abs.is_relative_to(ROOT.resolve()) and abs.is_file(),(key,uri)
 for d in doc.get('meshes',[]):
  assert d.get('primitives'),key
 print('GLTF PASS',key,path.stat().st_size)
for key,sfx in M['audio'].items():
 path=ROOT/sfx['url'];data=path.read_bytes()
 assert data[:4]==b'OggS',key
 assert hashlib.sha256(data).hexdigest()==sfx['sha256'],key
 print('SFX PASS',key,len(data))
for key,pbr in M['pbr'].items():
 path=ROOT/pbr['url'];data=path.read_bytes()
 assert data[:4]==b'RIFF' and data[8:12]==b'WEBP',(key,data[:12])
 assert hashlib.sha256(data).hexdigest()==pbr['sha256'],key
 print('PBR PASS',key,len(data))
print('CUADRANTE PREMIUM ASSETS PASS: 11 GLTF, 8 OGG, 4 WEBP, size budget under 12 MiB')

#!/usr/bin/env python3
"""Build deterministic, local CC0 CUADRANTE assets from author-hosted free archives.

Only explicitly selected standard-tier Quaternius glTF+dependencies, 8 Kenney
OGGs and 512px ambientCG PBR channels are checked into this game.
Do not commit full source archives or licensed paid packs.
"""
from pathlib import Path, PurePosixPath
from urllib.request import Request, urlopen
from zipfile import ZipFile
import json, os, shutil, hashlib, io, tempfile
from PIL import Image

ROOT=Path("assets/cuadrante")
MODEL_DIR=ROOT/"models"
SFX=ROOT/"audio"
PBR=ROOT/"pbr"
SOURCES={
 "quaternius": "https://opengameart.org/sites/default/files/modular_scifi_megakitstandard.zip",
 "kenney": "https://kenney.nl/media/pages/assets/sci-fi-sounds/6b296f9ecf-1677589334/kenney_sci-fi-sounds.zip",
 "ambientcg": "https://ambientcg.com/get?file=Metal032_1K-JPG.zip"
}
SELECTION={
 "columnAstra":"Columns/Column_Astra",
 "columnHollow":"Columns/Column_Hollow",
 "columnPipes":"Columns/Column_Pipes",
 "columnSupport":"Columns/Column_MetalSupport",
 "frameSquare":"Platforms/Door_Frame_Square",
 "frameTall":"Platforms/Door_Frame_SquareTall",
 "darkDoor":"Platforms/Door_DarkMetal",
 "darkPlatform":"Platforms/Platform_DarkPlates",
 "metalPlatform":"Platforms/Platform_Metal",
 "plateSet":"Platforms/Platform_3Plates",
 "railSet":"Platforms/Platform_Rails_4"
}
SOUND={
 "hit":"impactMetal_000.ogg",
 "perfect":"forceField_000.ogg",
 "smash":"laserLarge_000.ogg",
 "enemy":"laserSmall_002.ogg",
 "wall":"impactMetal_003.ogg",
 "goal":"lowFrequency_explosion_000.ogg",
 "conceded":"explosionCrunch_000.ogg",
 "transform":"computerNoise_000.ogg"
}
def archive(url):
 req=Request(url,headers={"User-Agent":"ModoCaosAssets/1.0 (CC0 attribution)","Accept":"application/zip"})
 with urlopen(req,timeout=90) as resp:
  if resp.status!=200: raise RuntimeError(f"Bad download HTTP {resp.status}: {url}")
  with tempfile.SpooledTemporaryFile(max_size=4*1024*1024) as f:
   shutil.copyfileobj(resp,f)
   f.seek(0)
   data=f.read()
 if not data.startswith(b"PK"): raise ValueError(f"Not a ZIP archive: {url}")
 return ZipFile(io.BytesIO(data)),hashlib.sha256(data).hexdigest(),len(data)
def copy_member(z,name,output):
 if name not in z.namelist(): raise RuntimeError("Missing licensed package member: "+name)
 body=z.read(name)
 if len(body)>2_500_000: raise RuntimeError("Single selected model too large: "+name)
 output.parent.mkdir(parents=True,exist_ok=True)
 output.write_bytes(body)
 return {"bytes":len(body),"sha256":hashlib.sha256(body).hexdigest()}
def main():
 for folder in (MODEL_DIR,SFX,PBR):folder.mkdir(parents=True,exist_ok=True)
 manifest={"revision":1,"license":"CC0-1.0","source_urls":SOURCES.copy(),"models":{},"audio":{},"pbr":{},"source_sha256":{}}
 # Quaternius: keep exact relative paths (buffers/textures resolved by GLTFLoader).
 z,hashval,length=archive(SOURCES["quaternius"]);manifest["source_sha256"]["quaternius"]=hashval
 print("Downloaded Quaternius free standard pack:",length, "bytes",flush=True)
 names=set(z.namelist());prefix="Modular SciFi MegaKit[Standard]/glTF/"
 deps=set()
 for key,name in SELECTION.items():
  member=prefix+name+".gltf"
  if member not in names: raise RuntimeError("Not in free pack: "+member)
  gltf=json.loads(z.read(member))
  used={member}
  for part in (gltf.get("buffers",[])+gltf.get("images",[])):
   uri=part.get("uri","")
   if not uri or uri.startswith("data:"):continue
   path=PurePosixPath(member).parent/uri
   import posixpath
   path=posixpath.normpath(str(path))
   if not path.startswith(prefix) or path not in names:raise ValueError("Unsafe or missing glTF dependency: "+path)
   used.add(path)
  deps.update(used)
  manifest["models"][key]={"url":"models/"+name+".gltf","triangles":"from supplier original; render outside gameplay collision field"}
 for member in sorted(deps):
  target=MODEL_DIR/Path(member[len(prefix):])
  info=copy_member(z,member,target)
  print("3D MODEL RESOURCE",member[len(prefix):],info["bytes"],flush=True)
 # Kenney normalized .ogg.
 z,hashval,length=archive(SOURCES["kenney"]);manifest["source_sha256"]["kenney"]=hashval
 print("Downloaded Kenney:",length,flush=True)
 for key,name in SOUND.items():
  info=copy_member(z,"Audio/"+name,SFX/name)
  manifest["audio"][key]={"url":"audio/"+name,**info}
 # ambientCG JPG -> small WEBP keeping channels correctly mapped.
 z,hashval,length=archive(SOURCES["ambientcg"]);manifest["source_sha256"]["ambientcg"]=hashval
 print("Downloaded ambientCG:",length,flush=True)
 for key,suffix in [("color","Color"),("normal","NormalGL"),("roughness","Roughness"),("metalness","Metalness")]:
  original=f"Metal032_1K-JPG_{suffix}.jpg"
  with Image.open(io.BytesIO(z.read(original))) as img:
   img=img.convert("RGB").resize((512,512),Image.Resampling.LANCZOS)
   fn=f"metal032-{key}.webp";target=PBR/fn
   img.save(target,"WEBP",quality=80 if key=="normal" else 74,method=6)
   data=target.read_bytes()
  manifest["pbr"][key]={"url":"pbr/"+fn,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()}
 # footprint guard prevents a feature-assets folder becoming a giant download.
 total=sum(x.stat().st_size for x in ROOT.rglob("*") if x.is_file())
 if total>12*1024*1024:raise RuntimeError("CUADRANTE CC0 asset budget exceeded: "+str(total))
 (ROOT/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 print("COMPLETED:",len(manifest["models"]),"models",len(SOUND),"OGG",len(manifest["pbr"]),"PBR",total,"bytes",flush=True)
if __name__=="__main__":main()

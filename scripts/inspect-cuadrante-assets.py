"""Source inspection only: CC0 Quaternius models, Kenney effects, ambientCG material zip."""
from urllib.request import Request,urlopen
from zipfile import ZipFile
from pathlib import Path
import tempfile, shutil, os
sources = {
"quaternius":"https://opengameart.org/sites/default/files/modular_scifi_megakitstandard.zip",
"kenney":"https://kenney.nl/media/pages/assets/sci-fi-sounds/6b296f9ecf-1677589334/kenney_sci-fi-sounds.zip",
"ambientcg":"https://ambientcg.com/get?file=Metal032_1K-JPG.zip"
}
for name,url in sources.items():
 print("ASSET SOURCE",name,url,flush=True)
 try:
  with urlopen(Request(url,headers={"User-Agent":"ModoCaos-asset-review/1.0 (CC0 game development)"}),timeout=45) as response:
   print("STATUS",response.status,"MIME",response.headers.get("Content-Type"),flush=True)
   with tempfile.TemporaryFile() as f:
    shutil.copyfileobj(response,f)
    f.seek(0); print("BYTES",f.seek(0,os.SEEK_END),flush=True);f.seek(0)
    if not ZipFile(f).testzip() is None: raise RuntimeError("bad zip member")
    f.seek(0)
    with ZipFile(f) as z:
     files=[v for v in z.namelist() if not v.endswith("/")]
     print("FILES",len(files),flush=True)
     if name=="quaternius":
      matches=[v for v in files if v.lower().endswith((".gltf",".glb",".bin",".png",".jpg",".jpeg"))]
      print("GLTF SET",len(matches),flush=True)
      for v in matches[:130]:print("FILE",v,flush=True)
     elif name=="kenney":
      for v in files[:110]:print("FILE",v,flush=True)
     else:
      for v in files[:40]:print("FILE",v,flush=True)
 except Exception as e: print("DOWNLOAD ERROR",name,type(e).__name__,str(e)[:500],flush=True)

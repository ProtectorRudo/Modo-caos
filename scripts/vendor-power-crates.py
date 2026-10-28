#!/usr/bin/env python3
"""Fetch only two small, CC0, self-contained glTF assets for CIVIDOM power crates.
No account, no login, no Fab library files. Never block the arcade build if
the vendor is temporarily unavailable: the authored canvas fallback remains.
"""
import hashlib
import json
import os
import struct
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "powercrates"
SOURCES = {
    "pickup-ammo": {
        "url": "https://cdn.3dassets.dev/assets/27680/v1/model.glb",
        "source": "https://3dassets.dev/assets/hero-shooter-harbour-payload-pickup-ammo-crate-2eac260e",
        "animations": ["spin"],
        "max_bytes": 350000,
    },
    "elite-locked": {
        "url": "https://cdn.3dassets.dev/assets/27451/v1/model.glb",
        "source": "https://3dassets.dev/assets/wipe-day-survival-island-elite-locked-crate-bede223e",
        "animations": ["open", "close"],
        "max_bytes": 250000,
    },
}
def validate_glb(raw, asset):
    if len(raw) < 28 or raw[:4] != b"glTF":
        raise ValueError("Not binary glTF")
    version, expected = struct.unpack_from("<II", raw, 4)
    if version != 2 or len(raw) != expected:
        raise ValueError("Unexpected glTF header or total byte length")
    length, kind = struct.unpack_from("<I4s", raw, 12)
    if kind != b"JSON" or length <= 0 or 20 + length > len(raw):
        raise ValueError("Missing JSON chunk")
    doc = json.loads(raw[20:20 + length].decode("utf-8").rstrip("\x00 "))
    if not doc.get("meshes") or not doc.get("scenes"):
        raise ValueError("Missing renderable mesh")
    if any(e not in {"KHR_mesh_quantization", "KHR_materials_unlit", "KHR_texture_transform",
                     "KHR_materials_emissive_strength"} for e in doc.get("extensionsRequired", [])):
        raise ValueError("Unsupported required GLB extension")
    return doc

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    assets={}
    for name, meta in SOURCES.items():
        path=OUT/(name + ".glb")
        try:
            if path.exists():
                data=path.read_bytes()
            else:
                request=urllib.request.Request(meta["url"], headers={"User-Agent": "CIVIDOM-CC0-Asset-Importer/1.0"})
                with urllib.request.urlopen(request, timeout=18) as handle:
                    data=handle.read(meta["max_bytes"] + 1)
            if not 200 < len(data) <= meta["max_bytes"]:
                raise ValueError("Unexpected source asset size")
            gltf=validate_glb(data, name)
            path.write_bytes(data)
            assets[name]={"source":meta["source"], "remote":meta["url"], "bytes":len(data),
                          "sha256":hashlib.sha256(data).hexdigest(), "license":"CC0-1.0",
                          "meshes":len(gltf.get("meshes",[])),
                          "animations":[x.get("name","") for x in gltf.get("animations",[])]}
            print(f"CIVIDOM power crate {name} verified: {len(data)} bytes, {len(gltf.get('meshes',[]))} meshes")
        except Exception as exc:
            if path.exists():path.unlink()
            print(f"CIVIDOM power crate {name} unavailable, retaining canvas fallback: {exc}")
    (OUT/"manifest.json").write_text(json.dumps(assets,indent=2)+"\n")
    print(f"CIVIDOM power crates: {len(assets)}/{len(SOURCES)} vendored, no user downloads")
if __name__=="__main__":
    main()

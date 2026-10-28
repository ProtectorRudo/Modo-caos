#!/usr/bin/env python3
"""Generate a public static GitHub Pages fallback without modifying Vercel source.
Only publish static arcade assets, never docs, SQL, tests or secrets.
"""
from pathlib import Path
import re
import shutil
import os

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "_site"
PREFIX = os.environ.get("STATIC_PREFIX", "/Modo-caos")
PUBLISH = {".html", ".js", ".mjs", ".css", ".json", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".woff", ".woff2", ".mp3", ".ogg", ".glb", ".gltf", ".wasm"}
TEXT = {".html", ".js", ".mjs", ".css"}
# Only rewrite quoted root-relative paths; preserve external https:// and // URLs.
ROOT_URL = re.compile(r"""(?P<quote>['"])(?P<path>/(?!/)[^'"]*)(?P=quote)""")

def rewrite(content: str) -> str:
    def prefix(match: re.Match) -> str:
        text = match.group("path")
        if text == "/" or re.match(r"^/[\w.-]+(?:/[\w.-]+)*\.(?:html|js|css|json|svg|png|jpe?g|webp|woff2?|mp3|ogg|glb|gltf|wasm)(?:[?#].*)?$", text):
            return match.group("quote") + PREFIX + text + match.group("quote")
        return match.group(0)
    return ROOT_URL.sub(prefix, content)

TARGET.mkdir(exist_ok=True)
published = []
for item in ROOT.iterdir():
    if not item.is_file() or item.suffix.lower() not in PUBLISH:
        continue
    # Only root static app files: no project keys, migrations, workflows, or hidden envs.
    if item.name.startswith(".") or "secret" in item.name.lower():
        continue
    out = TARGET / item.name
    if item.suffix.lower() in TEXT:
        out.write_text(rewrite(item.read_text(encoding="utf-8")), encoding="utf-8")
    else:
        shutil.copyfile(item, out)
    published.append(item.name)
# CIVIDOM: publish only verified, specifically named chibi GLBs and license files.
# Previously the root-only packager omitted .mjs and this asset directory,
# silently breaking the 3D roster on the GitHub Pages fallback.
STYLOO = ROOT / "assets" / "styloo"
ALLOWED_STYLOO = {"ninja.glb","archer.glb","student.glb","merchant.glb","knight.glb","manifest.json","LICENSE.txt"}
if STYLOO.exists() and STYLOO.is_dir():
    for item in STYLOO.iterdir():
        if not item.is_file() or item.is_symlink() or item.name not in ALLOWED_STYLOO:
            continue
        dest = TARGET / "assets" / "styloo" / item.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(item, dest)
        published.append("assets/styloo/" + item.name)
assert (TARGET / "paper-3d.mjs").is_file(), "CIVIDOM WebGL runtime missing from Pages"
assert (TARGET / "paper-chibi.mjs").is_file(), "CIVIDOM chibi rig runtime missing from Pages"
assert (TARGET / "paper.html").is_file(), "CIVIDOM game missing from Pages"
(TARGET / ".nojekyll").write_text("", encoding="utf-8")
assert {"index.html", "meteoros.html", "meteoros-runtime.js", "meteoros-core.js", "meteoros-art.js", "engine.js"}.issubset(published)
assert f'src="{PREFIX}/engine.js' in (TARGET / "meteoros.html").read_text()
assert f'href="{PREFIX}/meteoros.html' in (TARGET / "index.html").read_text()
assert (PREFIX == '' or 'src="/engine.js' not in (TARGET / "meteoros.html").read_text())
# Machine-checkable CIVIDOM deployment diagnostic; do not report ready just
# because the HTML exists. Every licensed GLB must pass its pinned Git SHA1.
import hashlib
import json
import os
import struct
pins = {
    "ninja": ("68c43531042e519d079db40d5f1ca82cb175b01f", 3255296),
    "archer": ("f6f2bab6bc937e5e8423500e822e769099013dd9", 3601824),
    "student": ("945cc37277f0ee612af455f860d57f5d97c7c6f0", 3753900),
    "merchant": ("2e2ea24996f16c11a10b124c4785edbc9667acf8", 3412152),
    "knight": ("3b4d673565c0c521c7391295d23cd9d9ae2b8e3b", 7007020),
}
validated_models = {}
for name, (digest, size) in pins.items():
    file = TARGET / "assets" / "styloo" / (name + ".glb")
    valid = False
    if file.is_file() and file.stat().st_size == size:
        data = file.read_bytes()
        try:
            magic, version, declared = struct.unpack_from("<III", data)
            sha = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
            valid = magic == 0x46546c67 and version == 2 and declared == size and sha == digest
        except (ValueError, struct.error):
            valid = False
    validated_models[name] = valid
client_ready = all((TARGET / x).is_file() for x in ("paper.html", "paper-3d.mjs", "paper-chibi.mjs", "paper-fashion.mjs", "paper-mascots.mjs"))
status = {
    "game": "CIVIDOM",
    "art_direction": "rayo-nova-styloo-chibi",
    "source_commit": os.getenv("GITHUB_SHA") or os.getenv("VERCEL_GIT_COMMIT_SHA") or "unavailable",
    "page_present": client_ready,
    "models": validated_models,
    "ready_assets": client_ready and all(validated_models.values()),
    "note": "Asset integrity only; visual Android QA is a separate requirement."
}
(TARGET / "cividom-health.json").write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
print("CIVIDOM verified release assets:", status["ready_assets"], validated_models)

print("Pages static build OK:", len(published), "safe public files; prefix", PREFIX)

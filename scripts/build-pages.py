#!/usr/bin/env python3
"""Generate a public static GitHub Pages fallback without modifying Vercel source.
Only publish static arcade assets, never docs, SQL, tests or secrets.
"""
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "_site"
PREFIX = "/Modo-caos"
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
assert 'src="/Modo-caos/engine.js' in (TARGET / "meteoros.html").read_text()
assert 'href="/Modo-caos/meteoros.html' in (TARGET / "index.html").read_text()
assert 'src="/engine.js' not in (TARGET / "meteoros.html").read_text()
print("Pages static build OK:", len(published), "safe public files; prefix", PREFIX)

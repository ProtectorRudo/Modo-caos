#!/usr/bin/env python3
"""Build a safe, root-relative static output for Vercel without exposing source files.

GitHub Pages uses the same audited packager with /Modo-caos prefix; Vercel uses
an empty prefix and the project's configured public output directory.
"""
from pathlib import Path
import os
import runpy
import shutil

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "_site"
PUBLIC = ROOT / "public"
os.environ["STATIC_PREFIX"] = ""
if SITE.exists():
    shutil.rmtree(SITE)
runpy.run_path(str(ROOT / "scripts" / "build-pages.py"), run_name="__main__")

# Retain public static assets needed by other Modo Caos games, but never expose
# scripts, test fixtures, environment files, Git metadata or database files.
ALLOWED = {".html", ".js", ".mjs", ".css", ".json", ".svg", ".png", ".jpg",
           ".jpeg", ".webp", ".gif", ".woff", ".woff2", ".ttf", ".mp3",
           ".ogg", ".wav", ".glb", ".gltf", ".bin", ".wasm", ".ktx2"}
FOLDERS = ("assets", "models", "textures", "images", "audio", "sounds", "fonts", "static")
for folder in FOLDERS:
    base = ROOT / folder
    if not base.is_dir() or base.is_symlink():
        continue
    for src in base.rglob("*"):
        rel = src.relative_to(ROOT)
        if (not src.is_file() or src.is_symlink() or src.suffix.lower() not in ALLOWED
            or any(p.startswith(".") or "secret" in p.lower() or "private" in p.lower()
                   for p in rel.parts)):
            continue
        dst = SITE / rel
        if dst.exists():
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)

if PUBLIC.exists():
    shutil.rmtree(PUBLIC)
SITE.rename(PUBLIC)
assert (PUBLIC / "paper.html").is_file()
assert (PUBLIC / "paper-3d.mjs").is_file()
assert (PUBLIC / "paper-chibi.mjs").is_file()
assert (PUBLIC / "cividom-health.json").is_file()
print("Vercel static output ready:", PUBLIC)

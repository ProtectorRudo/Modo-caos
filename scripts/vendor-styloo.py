#!/usr/bin/env python3
"""Vendor immutable, CC0 Styloo Chibi GLBs for the public CIVIDOM static build.

This downloads the five original, rigged meshes only in CI; never requires
players to fetch, install, or unpack files. Both length and Git's blob hash
are pinned, so a corrupted or silently replaced source is never published.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import struct
import time

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "styloo"
PIN = "a68ea8ac843db770e24172d3319ac6cd07bec97a"
ROOT_URL = (
    f"https://raw.githubusercontent.com/binyoun-cberi/kidscade/{PIN}/"
    "assets/game/chibi/ChibiCharactersV1.2/ChibiCharacters/glb"
)
MODELS = {
    "ninja": ("68c43531042e519d079db40d5f1ca82cb175b01f", 3255296),
    "archer": ("f6f2bab6bc937e5e8423500e822e769099013dd9", 3601824),
    "student": ("945cc37277f0ee612af455f860d57f5d97c7c6f0", 3753900),
    "merchant": ("2e2ea24996f16c11a10b124c4785edbc9667acf8", 3412152),
    "knight": ("3b4d673565c0c521c7391295d23cd9d9ae2b8e3b", 7007020),
}


def verified(name: str, data: bytes) -> tuple[str, str]:
    expected_sha, expected_size = MODELS[name]
    if len(data) != expected_size:
        raise ValueError(f"{name}: size mismatch: {len(data)} != {expected_size}")
    if len(data) < 20:
        raise ValueError(f"{name}: truncated file")
    magic, version, size = struct.unpack_from("<III", data)
    if magic != 0x46546C67 or version != 2 or size != len(data):
        raise ValueError(f"{name}: invalid GLB v2")
    digest = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\\0" + data).hexdigest()
    if digest != expected_sha:
        raise ValueError(f"{name}: Git source hash mismatch: {digest}")
    return digest, hashlib.sha256(data).hexdigest()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "author": "Styloo",
        "license": "CC0-1.0",
        "source": "https://styloo.itch.io/chibi",
        "verified_git_commit": PIN,
        "models": {},
    }
    for name, (sha, size) in MODELS.items():
        file = OUT / f"{name}.glb"
        if file.is_file():
            try:
                verified(name, file.read_bytes())
            except (OSError, ValueError):
                file.unlink()
        if not file.is_file():
            url = f"{ROOT_URL}/{name}pr.glb"
            last_error = None
            for attempt in range(3):
                try:
                    request = Request(url, headers={"User-Agent": "CIVIDOM-CC0-asset-vendor/1.0"})
                    with urlopen(request, timeout=55) as response:
                        data = response.read(size + 1)
                    verified(name, data)
                    file.write_bytes(data)
                    break
                except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
                    last_error = exc
                    time.sleep(2 + attempt)
            if not file.is_file():
                raise RuntimeError(f"Cannot securely vendor {name}: {last_error}")
        _, sha256 = verified(name, file.read_bytes())
        manifest["models"][name] = {"bytes": size, "git_blob_sha1": sha, "sha256": sha256}
        print(f"VALIDATED {name}.glb ({size:,} bytes)")
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\\n", encoding="utf-8")
    (OUT / "LICENSE.txt").write_text(
        "Styloo Chibi Characters - CC0 1.0 Universal\\n"
        "https://styloo.itch.io/chibi\\n"
        "https://creativecommons.org/publicdomain/zero/1.0/\\n",
        encoding="utf-8",
    )
    print("CIVIDOM: five real Styloo Chibi 3D models vendored, integrity verified")


if __name__ == "__main__":
    main()

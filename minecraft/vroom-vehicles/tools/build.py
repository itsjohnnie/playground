"""Check every JSON file, then package both packs into one .mcaddon.

    python3 tools/build.py

Produces dist/VroomVehicles.mcaddon. Open that file on a Windows PC, iPad or
Android device and Minecraft imports both packs.
"""
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKS = ROOT / "packs"
OUT = ROOT / "dist" / "VroomVehicles.mcaddon"


def check_json():
    bad = 0
    for path in sorted(PACKS.rglob("*.json")):
        try:
            json.loads(path.read_text())
        except json.JSONDecodeError as e:
            print(f"BROKEN  {path.relative_to(ROOT)}: {e}")
            bad += 1
    return bad


def check_links():
    """The behavior pack must point at the resource pack's uuid + version."""
    bp = json.loads((PACKS / "VroomVehicles_BP/manifest.json").read_text())
    rp = json.loads((PACKS / "VroomVehicles_RP/manifest.json").read_text())
    want = {"uuid": rp["header"]["uuid"], "version": rp["header"]["version"]}
    if want not in bp.get("dependencies", []):
        print("BROKEN  behavior pack does not depend on the resource pack")
        return 1
    return 0


def package():
    OUT.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for pack in sorted(PACKS.iterdir()):
            for f in sorted(pack.rglob("*")):
                if f.is_file():
                    z.write(f, f.relative_to(PACKS))
    print(f"built   {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    if check_json() + check_links():
        sys.exit(1)
    package()

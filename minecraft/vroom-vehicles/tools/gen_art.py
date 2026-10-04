"""Build every vehicle's model and the shared paint atlas.

    python3 tools/gen_art.py                     # all vehicles, into the resource pack
    python3 tools/gen_art.py jet_ski --out /tmp/x   # just some, somewhere else

Each vehicle lives in tools/vehicles/<id>.py and is built from the kit in
tools/artkit.py. Models go to models/entity/<id>.geo.json and the atlas to
textures/entity/vroom_atlas.png under the output folder (the resource pack by
default), plus fleet.json for tools/preview.js. Open a .geo.json in Blockbench to look at it by hand.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import artkit  # noqa: E402
import vehicles  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RP = ROOT / "packs" / "VroomVehicles_RP"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*", help="vehicle ids (default: every vehicle)")
    ap.add_argument("--out", type=Path, default=RP, help="output folder")
    args = ap.parse_args()

    mods = vehicles.load(args.ids or None)
    if args.ids and len(mods) != len(args.ids):
        sys.exit(f"missing vehicle module(s): {set(args.ids) - {m.INFO['id'] for m in mods}}")
    used = set()
    for m in mods:
        vid = m.INFO["id"]
        bones = m.build()
        used |= artkit.materials_used(bones)
        geo = artkit.geometry(f"geometry.vroom.{vid}", bones)
        path = args.out / f"models/entity/{vid}.geo.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(geo, separators=(",", ":")) + "\n")
        print(f"{vid:16} {artkit.count_boxes(bones):5} boxes")
    artkit.write_png(args.out / "textures/entity/vroom_atlas.png", artkit.paint_atlas(used))
    # what the preview tool needs to know (scene, easter-egg camera)
    fleet = {m.INFO["id"]: {k: m.INFO.get(k) for k in ("name", "mode", "egg_cam")} for m in mods}
    (args.out / "fleet.json").write_text(json.dumps(fleet, indent=1) + "\n")
    _, uw, uh = artkit.atlas_layout()
    print(f"atlas {uw}x{uh} ({len(artkit.MATERIALS)} materials, {len(used)} used)")


if __name__ == "__main__":
    main()

"""Build the Vroom Garage previewer: garage/index.html.

    python3 tools/build_garage.py [--artifact out.html]

Inlines the paint atlas and every finished vehicle's model into the page, so
it runs anywhere (GitHub Pages, or opened straight from disk). Vehicles that
have no module yet are listed as planned. --artifact also writes a version
without the <html>/<head> wrapper, for publishing as a claude.ai artifact.
Run tools/gen_art.py first.
"""
import base64
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vehicles  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RP = ROOT / "packs" / "VroomVehicles_RP"
GARAGE = ROOT / "garage"

# names and lengths for the fleet list, before a vehicle is built
PLANNED = {
    "speedboat": ("Speedboat", "Water", 3), "jet_ski": ("Jet Ski", "Small", 2),
    "center_console": ("Center Console", "Water", 4), "offshore_racer": ("Offshore Racer", "Water", 6),
    "wake_boat": ("Wake Boat", "Water", 4), "pontoon": ("Pontoon Party Boat", "Water", 5),
    "power_catamaran": ("Power Catamaran", "Water", 8), "superyacht": ("Superyacht", "Water", 14),
    "go_kart": ("Go-Kart", "Small", 2), "quad_atv": ("Quad ATV", "Small", 2),
    "dirt_bike": ("Dirt Bike", "Small", 2), "sport_bike": ("Sport Bike", "Small", 2),
    "supercar": ("Supercar", "Land", 3), "offroad_4x4": ("Off-Road 4x4", "Land", 3),
    "farm_tractor": ("Farm Tractor", "Land", 3), "cyber_plow": ("Cyber Plow", "Land", 4),
    "monster_truck": ("Monster Truck", "Land", 4), "hot_air_balloon": ("Hot Air Balloon", "Air", 3),
    "helicopter": ("Helicopter", "Air", 6), "seaplane": ("Seaplane", "Air", 7),
}
GROUPS = ["Small", "Water", "Land", "Air"]
KEEP = ("name", "kind", "group", "mode", "length", "specs", "recipe_text", "eggs", "egg_cam",
        "anim", "speed", "fly_speed")


def data():
    built = {m.INFO["id"]: m.INFO for m in vehicles.load()
             if (RP / f"models/entity/{m.INFO['id']}.geo.json").exists()}
    cars = {}
    for vid, info in built.items():
        geo = json.loads((RP / f"models/entity/{vid}.geo.json").read_text())
        cars[vid] = {"info": {k: info.get(k) for k in KEEP}, "geo": geo}
    fleet = []
    for g in GROUPS:
        items = []
        for vid in vehicles.ORDER:
            name, group, length = PLANNED[vid]
            if vid in built:
                name, group, length = built[vid]["name"], built[vid]["group"], built[vid]["length"]
            if group == g:
                items.append({"id": vid, "name": name, "length": length, "ready": vid in built})
        fleet.append({"group": g, "items": items})
    atlas = base64.b64encode((RP / "textures/entity/vroom_atlas.png").read_bytes()).decode()
    return {"atlas": f"data:image/png;base64,{atlas}", "fleet": fleet, "vehicles": cars}


def page_body():
    body = (GARAGE / "garage.template.html").read_text()
    lib = (ROOT / "tools/bedrock-model.js").read_text()
    body = body.replace("/*__MODEL_LIB__*/", lib)
    return body.replace("/*__DATA__*/", json.dumps(data(), separators=(",", ":"), ensure_ascii=False))


def main():
    body = page_body()
    head, rest = body.split("</style>", 1)
    full = ("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
            f"{head}</style>\n</head>\n<body>\n{rest}</body>\n</html>\n")
    (GARAGE / "index.html").write_text(full)
    print(f"built   garage/index.html ({len(full) // 1024} KB)")
    if "--artifact" in sys.argv:
        out = Path(sys.argv[sys.argv.index("--artifact") + 1])
        out.write_text(body)
        print(f"built   {out}")


if __name__ == "__main__":
    main()

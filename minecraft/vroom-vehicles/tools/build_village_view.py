"""Build the Vroom Harbor previewer: village/index.html.

    python3 tools/build_village_view.py [--artifact out.html]

Inlines the village blocks and textures (from tools/village.py) and the
vehicles parked around town (from the resource pack), so the page runs
anywhere. --artifact also writes a version without the <html>/<head> wrapper,
for publishing as a claude.ai artifact.
"""
import base64
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RP = ROOT / "packs" / "VroomVehicles_RP"
VILLAGE = ROOT / "village"


def data_uri(path):
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def page_body():
    data = json.loads((VILLAGE / "village.json").read_text())
    data["atlasImage"] = data_uri(VILLAGE / "atlas.png")
    data["vehicleAtlas"] = data_uri(RP / "textures/entity/vroom_atlas.png")
    data["models"] = {v["id"]: json.loads((RP / f"models/entity/{v['id']}.geo.json").read_text())
                      for v in data["vehicles"]}
    body = (VILLAGE / "village.template.html").read_text()
    body = body.replace("/*__MODEL_LIB__*/", (ROOT / "tools/bedrock-model.js").read_text())
    return body.replace("/*__DATA__*/", json.dumps(data, separators=(",", ":")))


def main():
    body = page_body()
    head, rest = body.split("</style>", 1)
    full = ("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
            f"{head}</style>\n</head>\n<body>\n{rest}</body>\n</html>\n")
    (VILLAGE / "index.html").write_text(full)
    print(f"built   village/index.html ({len(full) // 1024} KB)")
    if "--artifact" in sys.argv:
        out = Path(sys.argv[sys.argv.index("--artifact") + 1])
        out.write_text(body)
        print(f"built   {out}")


if __name__ == "__main__":
    main()

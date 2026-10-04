"""Build the Vroom Garage previewer: garage/index.html.

    python3 tools/build_garage.py [--artifact out.html]

Inlines every finished vehicle's model and texture into the page, so it runs
anywhere (GitHub Pages, or opened straight from disk). --artifact also writes
a version without the <html>/<head> wrapper, for publishing as a claude.ai
artifact.
"""
import base64
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RP = ROOT / "packs" / "VroomVehicles_RP"
GARAGE = ROOT / "garage"
VEHICLES = ["speedboat"]


def page_body():
    models = {}
    for name in VEHICLES:
        geo = json.loads((RP / f"models/entity/{name}.geo.json").read_text())
        png = base64.b64encode((RP / f"textures/entity/{name}.png").read_bytes()).decode()
        models[name] = {"geo": geo, "texture": f"data:image/png;base64,{png}"}
    body = (GARAGE / "garage.template.html").read_text()
    lib = (ROOT / "tools/bedrock-model.js").read_text()
    body = body.replace("/*__MODEL_LIB__*/", lib)
    return body.replace("/*__MODELS__*/", json.dumps(models, separators=(",", ":")))


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

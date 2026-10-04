"""Every vehicle in the fleet, one module each.

A vehicle module defines INFO (what the game and the garage need to know)
and build() (its bones, made with tools/artkit.py). The order here is the
order of the fleet list.

INFO keys
---------
id, name, kind      ids are snake_case; kind is a short description ("Runabout")
group               fleet list heading: "Small", "Water", "Land" or "Air"
mode                how it moves: "water", "land", "air" or "seaplane"
length              length in blocks, for the fleet list
specs               [(label, value), ...] for the garage spec card
seats               [(x, y, z), ...] in model pixels: centre of each seat,
                    y = top of the cushion. The first seat drives.
collision           (width, height) in blocks
speed               minecraft:movement value (land/water); fly_speed for air
water_drag          water and seaplane modes (lower glides further)
step                land mode: how high it drives up, in blocks (1.0625 = a block)
recipe              {"shapeless": [items]} or {"pattern": [...], "key": {...}}
recipe_text         the recipe in words
spawn_egg           (base colour, overlay colour)
anim                [{"bone", "type", ...}] driven by speed and turning:
                      lift   {"k", "max", "offset"=0} nose up as speed grows (x)
                      roll   {"radius"} wheels rolling (x), radius in pixels
                      spin   {"axis", "idle", "ridden", "per_speed"} rotors and props, deg/s
                      turn   {"axis", "k", "max"} leaning or steering into turns
                      bob    {"axis", "amp", "freq"} a gentle idle wobble
eggs                where LUNA and INDI are hidden, in words
egg_cam             {"eye": [x, y, z], "at": [x, y, z]} camera that shows them (pixels)
script              optional: "plow" or "till"
health              optional, default 10
"""
import importlib

ORDER = [
    "speedboat", "jet_ski", "center_console", "offshore_racer", "wake_boat",
    "pontoon", "power_catamaran", "superyacht",
    "go_kart", "quad_atv", "dirt_bike", "sport_bike",
    "supercar", "offroad_4x4", "farm_tractor", "cyber_plow", "monster_truck",
    "hot_air_balloon", "helicopter", "seaplane",
]


def load(ids=None):
    """Import vehicle modules (registering their materials). Missing ones are skipped."""
    mods = []
    for vid in ids or ORDER:
        try:
            mods.append(importlib.import_module(f"vehicles.{vid}"))
        except ModuleNotFoundError as e:
            if e.name != f"vehicles.{vid}":
                raise
    return mods

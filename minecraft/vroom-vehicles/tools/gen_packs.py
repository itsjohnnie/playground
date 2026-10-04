"""Write every vehicle's Minecraft files from its INFO.

    python3 tools/gen_packs.py

For each vehicle in tools/vehicles/ this writes, in the behavior pack, the
entity (how it moves), its item, recipe and drop; and in the resource pack,
its client entity (how it looks) and its animation. Plus the shared item
texture list and the English names. Run tools/gen_art.py first for the models.

How each mode moves:
  water     floats (minecraft:buoyant) and steers where the driver looks
  land      drives where the driver looks and climbs `step` blocks
  air       parked with gravity; with a rider it flies where they look
  seaplane  floats and taxis on water; with a rider it can fly
"""
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import vehicles  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BP = ROOT / "packs" / "VroomVehicles_BP"
RP = ROOT / "packs" / "VroomVehicles_RP"
NS = "vroom"


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


# --- behavior pack -------------------------------------------------------------------

def seats(info):
    out, n = [], len(info["seats"])
    for i, (x, y, z) in enumerate(info["seats"]):
        out.append({"position": [round(-x / 16, 3), round(y / 16 - 0.2, 3), round(-z / 16, 3)],
                    "min_rider_count": i, "max_rider_count": n})
    return out


def entity(info):
    vid, mode = info["id"], info["mode"]
    width, height = info["collision"]
    hp = info.get("health", 10)
    comps = {
        "minecraft:type_family": {"family": ["vroom_vehicle", mode, "inanimate"]},
        "minecraft:collision_box": {"width": width, "height": height},
        "minecraft:health": {"value": hp, "max": hp},
        "minecraft:damage_sensor": {"triggers": [
            {"on_damage": {"filters": {"test": "is_family", "subject": "other", "value": "player"}},
             "deals_damage": True},
            {"cause": "all", "deals_damage": False},
        ]},
        "minecraft:loot": {"table": f"loot_tables/entities/{vid}.json"},
        "minecraft:physics": {},
        "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
        "minecraft:knockback_resistance": {"value": 1.0},
        "minecraft:breathable": {"breathes_air": True, "breathes_water": True},
        "minecraft:fire_immune": {},
        "minecraft:rideable": {
            "seat_count": len(info["seats"]), "controlling_seat": 0,
            "family_types": ["player"], "interact_text": "action.interact.ride.boat"
            if mode in ("water", "seaplane") else "action.interact.mount",
            "crouching_skip_interact": True, "pull_in_entities": False,
            "seats": seats(info),
        },
        "minecraft:movement": {"value": info.get("speed", info.get("fly_speed", 0.2))},
        "minecraft:movement.basic": {},
        "minecraft:conditional_bandwidth_optimization": {},
    }
    if mode in ("water", "seaplane"):
        comps["minecraft:buoyant"] = {
            "base_buoyancy": 1.0, "apply_gravity": True, "simulate_waves": True,
            "big_wave_probability": 0.03, "big_wave_speed": 10.0,
            "liquid_blocks": ["minecraft:water", "minecraft:flowing_water"]}
        comps["minecraft:water_movement"] = {"drag_factor": info.get("water_drag", 0.25)}
    if mode in ("water", "land", "seaplane"):
        comps["minecraft:input_ground_controlled"] = {}
    if mode == "land":
        step = info.get("step", 1.0625)
        comps["minecraft:variable_max_auto_step"] = {"base_value": step, "jump_prevented_value": step}

    body = {"description": {"identifier": f"{NS}:{vid}", "is_spawnable": True,
                            "is_summonable": True, "is_experimental": False},
            "components": comps}
    if mode in ("air", "seaplane"):
        # Flying is switched on while someone is aboard, so an empty aircraft
        # settles to the ground (or the water) instead of hanging in the sky.
        fly = info.get("fly_speed", 0.12)
        body["component_groups"] = {
            f"{NS}:flying": {
                "minecraft:physics": {"has_gravity": False},
                "minecraft:input_air_controlled": {},
                "minecraft:flying_speed": {"value": fly},
                "minecraft:movement": {"value": fly},
            },
        }
        has_air = {"test": "has_component", "subject": "self", "value": "minecraft:input_air_controlled"}
        comps["minecraft:environment_sensor"] = {"triggers": [
            {"filters": {"all_of": [
                {"test": "rider_count", "subject": "self", "operator": ">", "value": 0},
                {**has_air, "operator": "!=", "value": "minecraft:input_air_controlled"},
            ]}, "event": f"{NS}:take_off"},
            {"filters": {"all_of": [
                {"test": "rider_count", "subject": "self", "operator": "==", "value": 0},
                has_air,
            ]}, "event": f"{NS}:land"},
        ]}
        body["events"] = {
            f"{NS}:take_off": {"add": {"component_groups": [f"{NS}:flying"]}},
            f"{NS}:land": {"remove": {"component_groups": [f"{NS}:flying"]}},
        }
    return {"format_version": "1.20.80", "minecraft:entity": body}


def item(info):
    vid = info["id"]
    return {"format_version": "1.21.40", "minecraft:item": {
        "description": {"identifier": f"{NS}:{vid}", "menu_category": {"category": "items"}},
        "components": {
            "minecraft:icon": {"textures": {"default": f"{NS}_{vid}"}},
            "minecraft:display_name": {"value": info["name"]},
            "minecraft:max_stack_size": 1,
            "minecraft:entity_placer": {"entity": f"{NS}:{vid}"},
        }}}


def recipe(info):
    vid, r = info["id"], info["recipe"]
    result = {"item": f"{NS}:{vid}"}
    desc = {"identifier": f"{NS}:{vid}"}
    if "shapeless" in r:
        items = r["shapeless"]
        return {"format_version": "1.20.10", "minecraft:recipe_shapeless": {
            "description": desc, "tags": ["crafting_table"], "unlock": [{"item": items[0]}],
            "ingredients": [{"item": i} for i in items], "result": result}}
    key = {k: {"item": v} for k, v in r["key"].items()}
    first = next(iter(r["key"].values()))
    return {"format_version": "1.20.10", "minecraft:recipe_shaped": {
        "description": desc, "tags": ["crafting_table"], "unlock": [{"item": first}],
        "pattern": r["pattern"], "key": key, "result": result}}


def loot(info):
    return {"pools": [{"rolls": 1, "entries": [
        {"type": "item", "name": f"{NS}:{info['id']}", "weight": 1}]}]}


# --- resource pack ---------------------------------------------------------------------

AXES = {"x": 0, "y": 1, "z": 2}


def num(x):
    return f"{x:g}"


def molang(info):
    """Turn INFO["anim"] into pre-animation scripts and per-bone rotations."""
    init, pre, bones = [], [], {}

    def add(bone, axis, expr):
        bones.setdefault(bone, [[], [], []])[AXES[axis]].append(expr)

    for i, a in enumerate(info.get("anim", [])):
        kind, bone, var = a["type"], a["bone"], f"v.a{i}"
        if kind == "lift":
            add(bone, "x", f"-math.clamp((q.ground_speed - {num(a.get('offset', 0))}) * "
                           f"{num(a['k'])}, 0, {num(a['max'])})")
        elif kind == "roll":
            per_block = 360 / (2 * math.pi * a["radius"] / 16)
            init.append(f"{var} = 0;")
            pre.append(f"{var} = {var} + q.ground_speed * q.delta_time * {per_block:.2f};")
            add(bone, "x", var)
        elif kind == "spin":
            rate = (f"(q.has_rider ? {num(a.get('ridden', 0))} : {num(a.get('idle', 0))})"
                    f" + q.ground_speed * {num(a.get('per_speed', 0))}")
            init.append(f"{var} = 0;")
            pre.append(f"{var} = {var} + q.delta_time * ({rate});")
            add(bone, a["axis"], var)
        elif kind == "turn":
            m = num(a["max"])
            add(bone, a["axis"], f"math.clamp(q.yaw_speed * {num(a['k'])}, -{m}, {m})")
        elif kind == "bob":
            add(bone, a["axis"], f"{num(a['amp'])} * math.sin(q.life_time * {num(a['freq'])} * 360)")
        else:
            raise ValueError(f"{info['id']}: unknown anim type {kind!r}")
    rot = {b: {"rotation": [" + ".join(e) if e else 0 for e in axes]} for b, axes in bones.items()}
    return init, pre, rot


def client_entity(info, init, pre):
    vid = info["id"]
    base, overlay = info.get("spawn_egg", ("#F2F2EE", "#24365E"))
    desc = {
        "identifier": f"{NS}:{vid}",
        "materials": {"default": "entity_alphatest", "glass": "entity_alphablend"},
        "textures": {"default": "textures/entity/vroom_atlas"},
        "geometry": {"default": f"geometry.{NS}.{vid}"},
        "render_controllers": [f"controller.render.{NS}.vehicle"],
        "spawn_egg": {"base_color": base, "overlay_color": overlay},
    }
    if info.get("anim"):
        desc["scripts"] = {"animate": ["drive"]}
        if init:
            desc["scripts"]["initialize"] = init
        if pre:
            desc["scripts"]["pre_animation"] = pre
        desc["animations"] = {"drive": f"animation.{NS}.{vid}.drive"}
    return {"format_version": "1.10.0", "minecraft:client_entity": {"description": desc}}


def main():
    mods = vehicles.load()
    infos = [m.INFO for m in mods]
    for old in ("entities", "items", "recipes", "loot_tables/entities"):
        for f in (BP / old).glob("*.json"):
            f.unlink()
    for old in ("entity", "animations"):
        for f in (RP / old).glob("*.json"):
            f.unlink()

    lang = []
    textures = {}
    for info in infos:
        vid = info["id"]
        write(BP / f"entities/{vid}.json", entity(info))
        write(BP / f"items/{vid}.json", item(info))
        write(BP / f"recipes/{vid}.json", recipe(info))
        write(BP / f"loot_tables/entities/{vid}.json", loot(info))
        init, pre, rot = molang(info)
        write(RP / f"entity/{vid}.entity.json", client_entity(info, init, pre))
        if info.get("anim"):
            write(RP / f"animations/{vid}.animation.json", {"format_version": "1.8.0", "animations": {
                f"animation.{NS}.{vid}.drive": {"loop": True, "bones": rot}}})
        textures[f"{NS}_{vid}"] = {"textures": f"textures/items/{vid}"}
        lang += [f"entity.{NS}:{vid}.name={info['name']}",
                 f"item.spawn_egg.entity.{NS}:{vid}.name={info['name']}"]

    write(RP / "textures/item_texture.json", {"resource_pack_name": NS, "texture_name": "atlas.items",
                                              "texture_data": textures})
    (RP / "texts/en_US.lang").write_text("\n".join(lang) + "\n")
    write(RP / "render_controllers/vehicle.render_controllers.json", {
        "format_version": "1.8.0", "render_controllers": {f"controller.render.{NS}.vehicle": {
            "geometry": "Geometry.default",
            "materials": [{"*": "Material.default"}, {"glass*": "Material.glass"}],
            "textures": ["Texture.default"]}}})
    print(f"wrote pack files for {len(infos)} vehicles: {', '.join(i['id'] for i in infos)}")


if __name__ == "__main__":
    main()

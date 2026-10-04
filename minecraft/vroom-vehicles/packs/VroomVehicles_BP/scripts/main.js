// Vehicles that change the world as they drive.
//
// Cyber Plow: while someone drives it, it clears natural blocks in a 3-wide,
// 3-tall patch just in front (dirt, stone, sand, plants, trees, snow...).
// Anything people build with (planks, glass, bricks, crops, chests) is safe.
//
// Farm Tractor: while driving, it turns grass and dirt behind it into
// farmland, ready for seeds.
import { system, world } from "@minecraft/server";

const NATURAL = new Set([
  "grass_block", "dirt", "coarse_dirt", "rooted_dirt", "podzol", "mycelium", "mud", "clay",
  "sand", "red_sand", "gravel", "stone", "granite", "diorite", "andesite", "deepslate",
  "tuff", "calcite", "netherrack", "moss_block", "snow", "snow_layer", "powder_snow",
  "short_grass", "tall_grass", "fern", "large_fern", "dead_bush", "vine", "dandelion",
  "poppy", "blue_orchid", "allium", "azure_bluet", "red_tulip", "orange_tulip",
  "white_tulip", "pink_tulip", "oxeye_daisy", "cornflower", "lily_of_the_valley",
  "sunflower", "lilac", "rose_bush", "peony", "cactus", "brown_mushroom", "red_mushroom",
  "pointed_dripstone", "dripstone_block", "sandstone", "red_sandstone",
]);
const TILLABLE = new Set(["grass_block", "dirt", "coarse_dirt", "dirt_path"]);

const isNatural = id => {
  const name = id.replace("minecraft:", "");
  return NATURAL.has(name) || name.endsWith("_log") || name.endsWith("_leaves")
    || name.endsWith("_ore");
};

function driving(vehicle) {
  const riders = vehicle.getComponent("minecraft:rideable")?.getRiders() ?? [];
  const v = vehicle.getVelocity();
  return riders.length > 0 && Math.hypot(v.x, v.z) > 0.02;
}

// unit vector the vehicle faces, from its yaw in degrees
function facing(vehicle) {
  const yaw = vehicle.getRotation().y * Math.PI / 180;
  return { x: -Math.sin(yaw), z: Math.cos(yaw) };
}

function plow(vehicle) {
  const { x: fx, z: fz } = facing(vehicle);
  const p = vehicle.location;
  for (let side = -1; side <= 1; side++) {
    for (let up = 0; up <= 2; up++) {
      const x = Math.floor(p.x + fx * 2.6 - fz * side);
      const z = Math.floor(p.z + fz * 2.6 + fx * side);
      const y = Math.floor(p.y + 0.2) + up;
      const block = vehicle.dimension.getBlock({ x, y, z });
      if (block && isNatural(block.typeId)) block.setType("minecraft:air");
    }
  }
}

function till(vehicle) {
  const { x: fx, z: fz } = facing(vehicle);
  const p = vehicle.location;
  for (let side = -1; side <= 1; side++) {
    const x = Math.floor(p.x - fx * 2.2 - fz * side);
    const z = Math.floor(p.z - fz * 2.2 + fx * side);
    const y = Math.floor(p.y - 0.5);
    const ground = vehicle.dimension.getBlock({ x, y, z });
    const above = vehicle.dimension.getBlock({ x, y: y + 1, z });
    if (ground && TILLABLE.has(ground.typeId.replace("minecraft:", "")) && above?.isAir) {
      ground.setType("minecraft:farmland");
    }
  }
}

system.runInterval(() => {
  for (const dim of ["overworld", "nether", "the_end"]) {
    const dimension = world.getDimension(dim);
    for (const v of dimension.getEntities({ type: "vroom:cyber_plow" })) if (driving(v)) plow(v);
    for (const v of dimension.getEntities({ type: "vroom:farm_tractor" })) if (driving(v)) till(v);
  }
}, 2);

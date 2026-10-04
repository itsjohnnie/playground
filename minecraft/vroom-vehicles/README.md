# Vroom! Vehicles

A Minecraft **Bedrock** add-on for Looney & Indy. They play on Nintendo Switch.
First up is a **speedboat**. The roadmap below covers the rest of the garage.

## The Switch catch (and the way around it)

The Switch can't import add-ons directly. Only Marketplace content installs
there. **A Switch can still join a world that has add-ons and download them
automatically.** So the plan is:

1. **Build and test** on a device that *can* import add-ons: a Windows PC
   (Minecraft for Windows), an iPad, or an Android tablet or phone.
   Macs can't run Bedrock.
2. **Make a world** on that device with both Vroom packs turned on.
3. **Share it with the Switch:**
   - **Realm (reliable):** Settings → Realms → *Replace world* with the
     Vroom world. The kids join the Realm from their Switch and get the packs
     on the way in. This needs a Realms Plus subscription.
   - **Same Wi-Fi (free, worth trying first):** open the world on the PC or
     iPad. The Switch sees it under *Friends* → *LAN Games*.

Keep **Experiments turned off** in the world settings. This add-on doesn't
need them, and Realms work best without them.

## Install (on PC, iPad or Android)

1. Download `dist/VroomVehicles.mcaddon` and open it. Minecraft imports
   both packs.
2. Create or edit a world → *Behavior Packs* → activate **Vroom! Vehicles**.
   The look-and-sound resource pack turns on with it.
3. Get a speedboat:
   - **Creative:** search the inventory for "Speedboat", or use its spawn egg.
   - **Survival:** craft **Oak Boat + Iron Ingot + Redstone**.
4. Place it next to the water and push it in, or place it on a block at the
   shoreline. Tap or right-click it to hop in. It has two seats.
5. **Steering:** move forward, and the boat goes where you look.
   **Getting out:** sneak.
   **Picking it up:** punch it a few times and it drops the Speedboat item.

## Make changes

```
python3 tools/gen_art.py   # rebuild model + paint + icons from the box list
python3 tools/build.py     # check JSON, package dist/VroomVehicles.mcaddon
```

| Want to change… | Edit |
|---|---|
| Speed | `minecraft:movement` → `value` in `packs/VroomVehicles_BP/entities/speedboat.json` |
| How slippery the water is | `minecraft:water_movement` → `drag_factor` (lower = glides further) |
| Where riders sit | `minecraft:rideable` → `seats[].position` (`[x, up, forward]` in blocks) |
| Colours | `PAINT` in `tools/gen_art.py` |
| Shape | the `SPEEDBOAT` box list in `tools/gen_art.py`, or open the `.geo.json` in [Blockbench](https://www.blockbench.net) |
| Recipe | `packs/VroomVehicles_BP/recipes/speedboat.json` |

When you change a pack, bump `version` in **both** `manifest.json` files.
Otherwise devices that already have the old version won't take the new one.

## Roadmap: easiest to hardest

| # | Vehicle | New trick it teaches |
|---|---|---|
| 1 | ✅ Speedboat | Floating, riding, steering, a recipe |
| 2 | Jet ski | Same as the boat but faster, with one seat and a smaller model |
| 3 | Go-kart → car → motorcycle | Driving on land, and engine sounds (`sounds.json`) |
| 4 | Supercar (the "Lamborghini") | Same as the car with a fancy model and paint, and more speed |
| 5 | Cyber plow truck | Breaking the blocks in front of it, using the Script API (`@minecraft/server`) |
| 6 | Hot air balloon | Going up and down slowly (script-controlled flight) |
| 7 | Airplane | Takeoff speed, pitch and turning. The hardest one |
| 8 | Catamaran / big ship | Lots of seats, a big hitbox and storage chests |

**Jobs for Looney & Indy:** design each vehicle in Blockbench (it runs on an
iPad too), pick the colours and names, invent the recipes, and test-drive
every version.

**Names:** if we ever publish this publicly (CurseForge, MCPEDL), rename the
brand-name cars first. "Raging Bull Supercar" and "Cyber Plow" are fine;
Lamborghini and Tesla are trademarks.

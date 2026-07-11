# PixelLab NPC State Prompts

Use these prompts when generating future character state sprites for Golden Whale Guild. Keep all outputs routed through `src/data/assetManifest.js`; static placeholder sprites remain valid fallbacks until state frames exist.

## Generic State Prompt

Create a game-ready fantasy city-builder NPC sprite in angled top-down / isometric-compatible pixel art, 64x64, transparent background, grounded with a soft shadow, readable at small size, warm medieval palette, no text, no UI.

Character role: [ROLE]  
Outfit / identity: [OUTFIT]  
Prop / tool: [ITEM]  
Mood: [MOOD]

Generate matching state variations for the exact same character:

- idle_default
- idle_blink
- walk_1
- walk_2
- walk_3
- walk_4
- interact
- carry
- hurt
- happy

Requirements:

- real walking poses, not simple tilt animation
- same perspective, scale, silhouette, and palette across all states
- animation-ready consistency
- transparent background
- suitable for a satirical fantasy city-builder game

## Examples

Hero adventurer:
Role: wandering adventurer hero. Outfit: practical leather armor, simple cloak, starter sword. Prop/tool: small sword. Mood: hopeful but underfunded.

Guild clerk:
Role: guild quest clerk. Outfit: tidy robe and little satchel of paperwork. Prop/tool: scroll bundle. Mood: officious and tired.

Tavern keeper:
Role: tavern service walker. Outfit: apron over medieval tunic. Prop/tool: tray or mug. Mood: warm, busy, slightly done with complaints.

Merchant trader:
Role: market trader. Outfit: colorful market vest and pouch. Prop/tool: small crate or coin purse. Mood: persuasive.

Guard patrol:
Role: town guard patrol. Outfit: simple helmet, padded armor, small shield. Prop/tool: spear or lantern. Mood: alert.

Potion seller:
Role: potion seller. Outfit: herbalist cloak with belt vials. Prop/tool: potion bottle. Mood: helpful, suspiciously branded.

Premium evangelist:
Role: Golden Whale premium evangelist. Outfit: blue and gold fantasy uniform, shiny trim. Prop/tool: tiny gold sign or coin tray. Mood: cheerful and morally flexible.

Goblin raider:
Role: small monster raider. Outfit: ragged goblin gear. Prop/tool: little club. Mood: mischievous and dangerous.

Skeleton attacker:
Role: undead attacker. Outfit: cracked bones with rusty bits of armor. Prop/tool: broken sword. Mood: spooky but readable.

## Downloaded characters (2026-07)

Seven PixelLab characters with 4-direction, 6-frame walk cycles + idle
rotations are integrated under `public/assets/characters/states/<key>/`:

- hero_default (Golden Whale Guild Basic Hero) — fallback for ALL heroes
- hero_honest_grinder, hero_broke_optimist, hero_debt_goblin,
  hero_veteran, hero_lucky_idiot, hero_noble_whale

File naming contract (manifest entries are generated in a loop at the bottom
of `src/data/assetManifest.js`):

- `idle_<south|east|north|west>.png` — rotation used as idle per facing
- `walk_<dir>_<1..6>.png` — walk cycle per facing

The runtime (`getHeroDirectionalFrames` in TownScene) resolves prefixes in
order: personal assetKey -> hero id -> hero_default. A direction set is
all-or-nothing per prefix so characters never mix their own frames with the
default ones. Actors with real directional frames never use flipX mirroring
or tilt/bob fake walking. Service walkers keep their worker identity and are
excluded from the hero_default fallback.

Still missing (generate as characters + template walk animations when
needed): guild clerk, tavern keeper, trader, guard patrol, gear runner,
potion seller, premium evangelist, goblin raider, skeleton attacker.

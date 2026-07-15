# Building Visual Audit

Audit date: 2026-07-15. The permanent reference and acceptance rules are in
`BUILDING_ART_BIBLE.md`. Pass means suitable for continued use, not that every
building already has a complete L1-L5 family.

| ID | Display name | Role | Footprint | Current asset | Style | Center | Scale | Function | Tiers | Action taken | Replacement | Remaining issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| guildhall | Guild Hall | Civic/quests | 3x3 | building_guild_hall | Pass | Pass | Pass | Pass | Pass L1-L3 | Retained reference | - | L4-L5 planned |
| tavern | Tavern | Beds/morale | 2x2 | building_tavern | Pass | Pass | Pass | Pass | Pass L1-L3 | Retained reference | - | L4-L5 planned |
| blacksmith | Blacksmith | Gear | 2x2 | building_blacksmith | Pass | Pass | Pass | Pass | Pass L1-L3 | Retained | - | - |
| training | Training Yard | Combat training | 3x2 | building_training_yard | Pass | Pass | Pass | Pass | Base only | Restored stronger adult-combat art; removed duplicate loose props | Historical detailed yard | Dedicated tiers planned |
| market | Market | Trade | 2x2 | building_market | Pass | Pass | Pass | Pass | Pass L1-L3 | Retained | - | - |
| dungeon | Dungeon Gate | Missions/threat | 3x2 | building_dungeon_gate | Pass | Pass | Pass | Pass | Base only | Retained | - | - |
| whale | Golden Whale Milking Station | Premium landmark | 3x3 | building_golden_whale | Fail | Pass | Pass | Pass | Base only | Aligned; selected compliant PixelLab candidate but download was blocked | PixelLab `591cd2c5-a7fa-4107-9643-1d7676f19122` pending | Current fallback remains too bright/icon-like |
| inn | Inn | Better lodging | 2x2 | building_inn | Pass | Pass | Pass | Pass | Base only | Retained reference | - | - |
| hero_hostel | Hero Hostel | Mass lodging | 3x2 | building_hero_hostel | Pass | Pass | Pass | Pass | Base only | Retained primary reference | - | - |
| premium_lodge | Premium Lodge | Premium lodging | 3x2 | building_premium_lodge | Pass | Pass | Pass | Pass | Base only | Retained | - | Accent share should be watched in future tiers |
| potion_shop | Potion Shop | Potions/healing | 2x2 | building_potion_shop | Pass | Pass | Pass | Pass | Base only | Retained | - | - |
| mentor_hall | Mentor Hall | Hero support | 2x2 | building_mentor_hall | Borderline | Pass | Pass | Pass | Base only | Aligned; retained | - | Slightly simplified style |
| watchtower | Watchtower | Detection/defense | 2x2 | building_watchtower | Pass | Pass | Pass | Pass | Base only | Retained primary reference | - | - |
| guard_post | Guard Post | Patrols | 2x2 | building_guard_post | Pass | Pass | Pass | Pass | Base only | Retained | - | - |
| arena | Arena | Combat training | 3x3 | building_arena | Pass | Pass | Pass | Pass | Base only | Retained | - | Could use fuller 3x3 yard in a future tier |
| bank_debt_office | Bank / Debt Office | Finance | 2x2 | building_bank_debt_office | Borderline | Pass | Pass | Pass | Base only | Aligned; retained | - | Cleaner/icon-like than references |
| gem_exchange | Gem Exchange | Secure trade | 2x1 | building_gem_exchange | Fail | Pass | Pass | Borderline | Base only | Preserved as world fallback; dedicated legacy preview added | PixelLab `bdb84615-13b3-46aa-9d9e-26c72db799f8` pending | Selected replacement download blocked |
| convenience_office | Convenience Office | Bureaucracy | 2x2 | building_convenience_office | Fail | Pass | Pass | Borderline | Base only | Preserved as world fallback; dedicated legacy preview added | PixelLab `d1c505ba-ba38-4c08-a9ac-200f166ef5de` pending | Selected replacement download blocked |
| roadside_ad_board | Roadside Ad Board | Satirical sign | 1x1 | object_notice_board_gold | Pass | Pass | Pass | Pass | N/A | Kept as small prop | - | Needs dedicated preview later |
| vip_lounge | VIP Lounge | Premium hospitality | 2x2 | building_vip_lounge | Fail | Pass | Pass | Borderline | Base only | Preserved as world fallback; dedicated legacy preview added | PixelLab `520a16fa-fe13-45af-8103-0092f88ac17b` pending | Selected replacement download blocked |
| lootbox_kiosk | Lootbox Kiosk | Premium kiosk | 1x1 | building_lootbox_kiosk | Pass | Pass | Pass | Pass | Base only | Retained | - | Intentionally small, not a house |
| lumber_camp | Lumber Camp | Wood extraction | 2x2 | building_lumber_camp | Pass | Pass | Pass | Pass | Base only | Retained | - | - |
| mining_camp | Mining Camp | Iron extraction | 2x2 | building_mining_camp | Pass | Pass | Pass | Pass | Base only | Retained | - | - |
| herbalist_hut | Herbalist Hut | Herb extraction | 2x2 | building_herbalist_hut | Pass | Pass | Pass | Pass | Base only | Retained | - | - |
| salvage_camp | Salvage Camp | Remote salvage | 2x2 | building_salvage_camp | Pass | Pass | Pass | Pass | Base only | Retained | - | Shared family art with yard pending distinct tier |
| storehouse | Storehouse | Raw storage | 2x2 | building_storehouse | Pass | Pass | Pass | Pass | Pass L1-L3 | Retained | - | - |
| frontier_outpost | Frontier Outpost | Frontier support | 2x2 | building_frontier_outpost | Pass | Pass | Pass | Pass | Base only | Retained | - | - |
| sawmill | Sawmill | Wood processing | 2x2 | building_sawmill | Pass | Pass | Pass | Pass | Base only | Fixed incorrect grove mapping | Existing dedicated sawmill | Dedicated tiers planned |
| workshop | Workshop | Tool production | 2x2 | building_blacksmith | Fail | Pass | Pass | Borderline | Base only | Marked as explicit fallback | None | Unrelated duplicate of Blacksmith |
| salvage_yard | Salvage Yard | Loot processing | 2x2 | building_salvage_camp | Pass | Pass | Pass | Pass | Base only | Fixed incorrect ruins mapping | Existing salvage-camp art | Needs distinct industrial yard asset eventually |
| warehouse | Warehouse | Finished storage | 3x2 | building_warehouse | Pass | Pass | Pass | Pass | Pass L1-L3 | Retained | - | - |
| premium_fabricator | Premium Fabricator | Premium production | 3x2 | building_premium_fabricator | Borderline | Pass | Pass | Pass | Pass L1-L3 | Kept coherent tier family | - | Too clean/gold-purple; regenerate family together |

## Civic Prop Audit

| ID | Role | Footprint | Previous asset | Result | Action |
| --- | --- | --- | --- | --- | --- |
| notice_board | Quest access | 1x1 | location_notice_board | Fail: sparse and visually weak | Uses `object_notice_board_02`, a compact detailed parchment board; Guild Hall remains an alternate quest entry |

## Renderer Findings

- Previous visual width/height fields acted as arbitrary per-building scaling.
- Building hit targets were broad rectangles that could cover nearby actors.
- Entrance markers relied on per-building offsets rather than footprint edges.
- Upgrade levels enlarged the same sprite and added detached markers, causing
  apparent footprint growth and stale visual debris.

All four now derive from the central footprint helper. Existing source sprites
still vary in transparent padding, so failed/borderline art remains listed
rather than hidden behind compensating offsets.

## PixelLab Review Pack

One 25-generation, four-frame review pack was generated from the Hero Hostel
style reference. All four frames passed visual review and were selected without
rerolls. The environment then rejected the network download because its usage
limit had been reached, so none of the selected frames is claimed as a local
world PNG. Existing files remain untouched; their copied preview files are
routed through the manifest separately from world keys.

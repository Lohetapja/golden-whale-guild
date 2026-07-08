# Golden Whale Guild Asset Style Guide

## Target Style

Golden Whale Guild uses cozy top-down / low 2.5D pixel fantasy town art with
clean outlines, warm materials, readable silhouettes, and a lightly satirical
premium-economy edge. New assets should match the first PixelLab reference set:

- `building_golden_whale.png`
- `building_tavern.png`
- `building_blacksmith.png`
- `hero_default.png`
- `icon_coin.png`

## Perspective And Scale

- Use low top-down / 2.5D RPG perspective for buildings, objects, and NPCs.
- Standalone buildings, objects, characters, and icons should use transparent
  backgrounds.
- Buildings should stay readable around 80-170 px wide in-game.
- Small locations and props should stay readable around 32-90 px wide in-game.
- NPCs should remain readable around 24-48 px tall in-game.
- Icons should read clearly at HUD size, usually 14-24 px in-game.

## UI Direction

- UI assets should feel like fantasy parchment, wood, brass, dark guild paper,
  or gold-trimmed satirical bureaucracy.
- Avoid modern dashboard styling, glassmorphism, SaaS cards, large admin
  panels, and generic mobile-app chrome.
- The map remains the primary interface. UI art supports inspector panels,
  Town Ledger, event ticker, quest cards, and small action buttons.

## Integration Rules

- Route every generated asset through `src/data/assetManifest.js`.
- Use normal `public/assets/**` paths only.
- Do not include local absolute paths, tokens, auth headers, or MCP config.
- Keep generated Phaser placeholder art as fallback/debug art.
- If an asset is missing, the game must still load and use the placeholder.

## Golden Whale Rule

The Golden Whale Milking Station should remain the strongest visual identity in
the town: gold, glow, whale signage, coin particles, VIP ropes, and suspicious
premium polish. Other buildings can be charming, but the Whale should look like
the town's most profitable bad idea.

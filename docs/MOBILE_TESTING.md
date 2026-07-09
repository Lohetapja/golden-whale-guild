# Mobile Testing Checklist

Golden Whale Guild uses a fixed 1280x720 Phaser canvas with `Scale.FIT`.
Check mobile changes on a real phone or browser device emulation before release.

## Screen Fit

- Open the local or live page in portrait.
- Rotate to landscape.
- Confirm there is no browser page scrolling or horizontal overflow.
- Confirm the top resources, bottom ticker, and bottom controls remain visible.

## Camera

- Drag one finger to pan the map.
- Pinch to zoom in and out.
- Use `+`, `-`, and `Home` camera buttons.
- Confirm camera bounds stop at the map edges.

## Build Flow

- Open `Build`.
- Switch categories.
- Scroll cards without the menu jumping.
- Select a dirt road and tap grid tiles to place roads.
- Select a Tavern or other building and tap a valid tile to place it.
- Drag the map while build mode is active and confirm it does not accidentally place.
- Use `Cancel` to leave build mode.

## Panels

- Open a building inspector.
- Tap a hero inspector.
- Open `More`, then Help, Town Log, Town Ledger, Save, and Reset.
- Confirm reset requires the confirmation panel.
- Open the day report after `Skip Day`.
- Confirm every panel can scroll and close with the `X`.

## Play Loop

- Tap `Skip Day`.
- Confirm events/resources update.
- Confirm speech bubbles and floating text do not overwhelm the screen.
- Save, reload, and confirm progress persists.

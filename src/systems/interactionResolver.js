export const INTERACTION_PRIORITY = {
  hero: 520,
  service: 500,
  loot: 480,
  monster: 450,
  decoration: 340,
  building: 300,
  fallback: 100,
};

const SPECIAL_PRIORITY = {
  watchtower: 410,
  dungeon: 390,
  whale: 380,
};

export function getInteractionPriority(target) {
  const explicit = Number(target.place?.interactionPriority);
  if (Number.isFinite(explicit)) return explicit;
  return SPECIAL_PRIORITY[target.id]
    || INTERACTION_PRIORITY[target.type]
    || INTERACTION_PRIORITY.fallback;
}

export function getInteractionBounds(target) {
  const center = target.getCenter();
  return {
    left: center.x - target.width / 2,
    right: center.x + target.width / 2,
    top: center.y - target.height / 2,
    bottom: center.y + target.height / 2,
  };
}

export function resolveInteractionTarget(targets, worldX, worldY, selection = {}) {
  const candidates = targets.filter((target) => {
    if (!target.hit?.active || !target.hit.visible) return false;
    if (target.type === 'hero' && target.hero?.container?.visible === false) return false;
    if (target.containsPoint) return target.containsPoint(worldX, worldY);
    const bounds = getInteractionBounds(target);
    return worldX >= bounds.left
      && worldX <= bounds.right
      && worldY >= bounds.top
      && worldY <= bounds.bottom;
  });

  candidates.sort((a, b) => {
    const priority = getInteractionPriority(b) - getInteractionPriority(a);
    if (priority) return priority;
    const specificity = (a.width * a.height) - (b.width * b.height);
    if (specificity) return specificity;
    const depth = (b.img?.depth || b.place?.y || b.hero?.container?.depth || 0)
      - (a.img?.depth || a.place?.y || a.hero?.container?.depth || 0);
    if (depth) return depth;
    const aSelected = a.id === selection.placeId || a.id === selection.heroId;
    const bSelected = b.id === selection.placeId || b.id === selection.heroId;
    return Number(bSelected) - Number(aSelected);
  });
  return candidates[0] || null;
}

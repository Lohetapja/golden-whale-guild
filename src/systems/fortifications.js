const definition = (id, name, options) => Object.freeze({ id, name, footprint: { w: 1, h: 1 }, ...options });

export const FORTIFICATION_TYPES = Object.freeze({
  palisade: definition('palisade', 'Wooden Palisade', {
    kind: 'wall', cost: 12, resources: { wood: 1 }, maxHealth: 70, armour: 1,
    description: 'Cheap connected timber defence. Easy to repair and equally easy to regret.',
    assetKey: 'fort_palisade_straight', previewAssetKey: 'fort_palisade_straight',
  }),
  stone_wall: definition('stone_wall', 'Stone Wall', {
    kind: 'wall', cost: 30, resources: { iron: 1, planks: 1 }, maxHealth: 170, armour: 5,
    description: 'A durable perimeter section built from masonry, iron braces, and municipal confidence.',
    assetKey: 'fort_stone_straight', previewAssetKey: 'fort_stone_straight',
  }),
  gate: definition('gate', 'Gate', {
    kind: 'gate', cost: 64, resources: { wood: 2, iron: 1 }, maxHealth: 105, armour: 2,
    description: 'Road-compatible traffic control. Civilians pass; monsters require structural criticism.',
    assetKey: 'fort_gate_wood_closed', previewAssetKey: 'fort_gate_wood_closed', requiresRoad: true,
  }),
  guard_tower: definition('guard_tower', 'Guard Tower', {
    kind: 'tower', cost: 190, resources: { wood: 3, iron: 2 }, maxHealth: 145, armour: 4,
    description: 'Detects raids, supports nearby defenders, and provides a commanding view of the problem.',
    assetKey: 'fort_tower_wood', previewAssetKey: 'fort_tower_wood', detectionRadius: 330,
  }),
  gatehouse: definition('gatehouse', 'Reinforced Gatehouse', {
    kind: 'gatehouse', cost: 285, resources: { planks: 3, iron: 4 }, maxHealth: 260, armour: 7,
    description: 'A fortified road entrance with guard capacity and much more expensive hinges.',
    assetKey: 'fort_gatehouse_closed', previewAssetKey: 'fort_gatehouse_closed', requiresRoad: true, detectionRadius: 260,
  }),
});

export const FORTIFICATION_LIMITS = Object.freeze({
  maxSegments: 600,
  attackHistory: 8,
  repairHistory: 6,
  perimeterRecalcCooldownMs: 120,
});

export const FORTIFICATION_SATIRE = Object.freeze({
  wall: [
    'The wall is mostly material, confidence, and deferred maintenance.',
    'Nothing gets through without first filling out a breach request.',
    'This section survived an inspection. The raid remains unconfirmed.',
    'The perimeter now has edges and therefore a budget problem.',
  ],
  gate: [
    'Open for heroes, closed for accountability.',
    'Commerce may pass after danger has finished queuing.',
    'The hinges are brave in a strictly mechanical sense.',
    'Emergency access remains available to anything large enough to remove it.',
  ],
  breach: [
    'The wall adopted an open-plan defence strategy.',
    'A new entrance appeared without planning permission.',
    'The monsters simplified local navigation.',
    'Management calls it a temporary access feature.',
  ],
  tower: [
    'Detection range increased. Courage remains unchanged.',
    'The tower provides a commanding view of everything going wrong.',
    'The watchman saw the raid and requested a second opinion.',
    'High ground has been acquired. Competence is pending.',
  ],
});

export function fortificationKey(x, y) {
  return `${x},${y}`;
}

export function getFortificationDefinition(type) {
  return FORTIFICATION_TYPES[type] || null;
}

export function normalizeFortification(raw, index = 0) {
  const def = getFortificationDefinition(raw?.type) || FORTIFICATION_TYPES.palisade;
  const maxHealth = Math.max(1, Number(raw?.maxHealth) || def.maxHealth);
  const health = Math.max(0, Math.min(maxHealth, Number.isFinite(Number(raw?.health)) ? Number(raw.health) : maxHealth));
  const state = health <= 0 ? 'breached' : health <= maxHealth * 0.32 ? 'heavy' : health < maxHealth ? 'damaged' : 'intact';
  return {
    ...raw,
    id: String(raw?.id || `fort-${def.id}-${index}`),
    type: def.id,
    x: Math.max(0, Math.floor(Number(raw?.x) || 0)),
    y: Math.max(0, Math.floor(Number(raw?.y) || 0)),
    health,
    maxHealth,
    armour: Math.max(0, Number(raw?.armour) || def.armour),
    state,
    open: ['gate', 'gatehouse'].includes(def.kind) ? Boolean(raw?.open ?? true) : false,
    construction: Math.max(0, Math.min(1, Number.isFinite(Number(raw?.construction)) ? Number(raw.construction) : 1)),
    priority: Boolean(raw?.priority),
    defenderId: raw?.defenderId || null,
    recentAttacks: Array.isArray(raw?.recentAttacks) ? raw.recentAttacks.slice(-FORTIFICATION_LIMITS.attackHistory) : [],
    recentRepairs: Array.isArray(raw?.recentRepairs) ? raw.recentRepairs.slice(-FORTIFICATION_LIMITS.repairHistory) : [],
  };
}

export function normalizeFortifications(raw) {
  if (!Array.isArray(raw)) return [];
  const seenCells = new Set();
  return raw.slice(0, FORTIFICATION_LIMITS.maxSegments).map(normalizeFortification).filter((entry) => {
    const key = fortificationKey(entry.x, entry.y);
    if (seenCells.has(key)) return false;
    seenCells.add(key);
    return true;
  });
}

export function isGate(fortification) {
  const kind = getFortificationDefinition(fortification?.type)?.kind;
  return kind === 'gate' || kind === 'gatehouse';
}

export function isFortificationBlocking(fortification) {
  if (!fortification || fortification.construction < 1 || fortification.health <= 0 || fortification.state === 'breached') return false;
  if (isGate(fortification)) return !fortification.open;
  return true;
}

export function canCloseGateSafely(friendlyActorCount = 0) {
  return Math.max(0, Number(friendlyActorCount) || 0) === 0;
}

export function getFortificationMask(index, x, y) {
  const connects = (nx, ny) => {
    const neighbor = index.get(fortificationKey(nx, ny));
    return Boolean(neighbor && neighbor.state !== 'breached' && neighbor.health > 0);
  };
  let mask = 0;
  if (connects(x, y - 1)) mask |= 1;
  if (connects(x + 1, y)) mask |= 2;
  if (connects(x, y + 1)) mask |= 4;
  if (connects(x - 1, y)) mask |= 8;
  return mask;
}

export const FORTIFICATION_MASK_NAMES = Object.freeze({
  0: 'isolated', 1: 'endpoint-north', 2: 'endpoint-east', 3: 'corner-north-east',
  4: 'endpoint-south', 5: 'straight-north-south', 6: 'corner-east-south', 7: 't-north-east-south',
  8: 'endpoint-west', 9: 'corner-west-north', 10: 'straight-east-west', 11: 't-west-north-east',
  12: 'corner-south-west', 13: 't-south-west-north', 14: 't-east-south-west', 15: 'crossroad',
});

export function getFortificationMaskName(mask) {
  return FORTIFICATION_MASK_NAMES[mask & 15] || 'isolated';
}

export function getDominantAxisLine(start, end) {
  if (!start || !end) return [];
  const dx = Math.floor(Number(end.x) || 0) - Math.floor(Number(start.x) || 0);
  const dy = Math.floor(Number(end.y) || 0) - Math.floor(Number(start.y) || 0);
  const useX = Math.abs(dx) >= Math.abs(dy);
  const distance = Math.abs(useX ? dx : dy);
  const step = Math.sign(useX ? dx : dy) || 1;
  return Array.from({ length: distance + 1 }, (_, index) => ({
    x: Math.floor(Number(start.x) || 0) + (useX ? index * step : 0),
    y: Math.floor(Number(start.y) || 0) + (useX ? 0 : index * step),
  }));
}

export function canReplaceWallWithGate(existing, gateType, hasRoad) {
  const existingDef = getFortificationDefinition(existing?.type);
  const gateDef = getFortificationDefinition(gateType);
  return Boolean(existing && existingDef?.kind === 'wall' && isGate({ type: gateType }) && gateDef?.requiresRoad && hasRoad);
}

export function replaceWallWithGate(existing, gateType) {
  if (!canReplaceWallWithGate(existing, gateType, true)) return null;
  const def = getFortificationDefinition(gateType);
  return normalizeFortification({
    ...existing,
    type: gateType,
    health: def.maxHealth,
    maxHealth: def.maxHealth,
    armour: def.armour,
    state: 'intact',
    open: true,
    construction: 0.2,
    defenderId: null,
  });
}

export function repairFortification(fortification, amount = Infinity, day = 1, workerId = null) {
  const before = fortification.health;
  fortification.health = Math.min(fortification.maxHealth, fortification.health + Math.max(0, Number(amount) || 0));
  fortification.state = fortification.health >= fortification.maxHealth
    ? 'intact'
    : fortification.health <= fortification.maxHealth * 0.32 ? 'heavy' : 'damaged';
  fortification.recentRepairs = [...(fortification.recentRepairs || []), { day, workerId, amount: fortification.health - before }]
    .slice(-FORTIFICATION_LIMITS.repairHistory);
  return fortification.health - before;
}

export function getFortificationVariant(mask) {
  const count = [1, 2, 4, 8].filter((bit) => mask & bit).length;
  if (!count) return 'isolated';
  if (count === 1) return 'endpoint';
  if (count === 2) return (mask === 5 || mask === 10) ? 'straight' : 'corner';
  if (count === 3) return 't-junction';
  return 'crossroad';
}

export function getFortificationCost(type, count = 1) {
  const def = getFortificationDefinition(type);
  if (!def) return { gold: 0, resources: {} };
  return {
    gold: def.cost * count,
    resources: Object.fromEntries(Object.entries(def.resources || {}).map(([id, amount]) => [id, amount * count])),
  };
}

export function assessFortificationCost(type, count, gold, inventory = {}) {
  const cost = getFortificationCost(type, count);
  const missing = [];
  if (gold < cost.gold) missing.push(`${cost.gold - gold} gold`);
  for (const [id, amount] of Object.entries(cost.resources)) {
    if ((Number(inventory[id]) || 0) < amount) missing.push(`${amount - (Number(inventory[id]) || 0)} ${id}`);
  }
  return { ...cost, affordable: missing.length === 0, missing };
}

export function damageFortification(fortification, rawDamage, day = 1, attacker = 'Monster') {
  const damage = Math.max(1, Math.round(Number(rawDamage) || 1) - Math.floor((fortification.armour || 0) * 0.55));
  fortification.health = Math.max(0, fortification.health - damage);
  fortification.state = fortification.health <= 0
    ? 'breached'
    : fortification.health <= fortification.maxHealth * 0.32
      ? 'heavy'
      : fortification.health < fortification.maxHealth
        ? 'damaged'
        : 'intact';
  fortification.recentAttacks = [...(fortification.recentAttacks || []), { day, attacker, damage }]
    .slice(-FORTIFICATION_LIMITS.attackHistory);
  return { damage, breached: fortification.state === 'breached' };
}

export function computePerimeter(columns, rows, fortifications, buildings = []) {
  const index = new Map(fortifications.map((entry) => [fortificationKey(entry.x, entry.y), entry]));
  const blocked = new Set(fortifications.filter(isFortificationBlocking).map((entry) => fortificationKey(entry.x, entry.y)));
  const outside = new Set();
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= columns || y >= rows) return;
    const key = fortificationKey(x, y);
    if (blocked.has(key) || outside.has(key)) return;
    outside.add(key);
    queue.push({ x, y });
  };
  for (let x = 0; x < columns; x += 1) { enqueue(x, 0); enqueue(x, rows - 1); }
  for (let y = 1; y < rows - 1; y += 1) { enqueue(0, y); enqueue(columns - 1, y); }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const { x, y } = queue[cursor];
    enqueue(x + 1, y); enqueue(x - 1, y); enqueue(x, y + 1); enqueue(x, y - 1);
  }
  const inside = new Set();
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const key = fortificationKey(x, y);
      if (!outside.has(key) && !blocked.has(key)) inside.add(key);
    }
  }
  const protectedBuildings = buildings.filter((building) => inside.has(fortificationKey(building.gridX, building.gridY)));
  const breached = fortifications.filter((entry) => entry.state === 'breached');
  const gates = fortifications.filter(isGate);
  const totalHealth = fortifications.reduce((sum, entry) => sum + entry.health, 0);
  const totalMaxHealth = fortifications.reduce((sum, entry) => sum + entry.maxHealth, 0);
  return {
    index, blocked, outside, inside,
    complete: inside.size > 0 && breached.length === 0,
    breached,
    gates,
    protectedBuildings,
    exposedBuildings: buildings.filter((building) => !inside.has(fortificationKey(building.gridX, building.gridY))),
    integrity: totalMaxHealth ? Math.round(totalHealth / totalMaxHealth * 100) : 0,
  };
}

export function chooseFortificationTarget(fortifications, actorCell, desiredCell, monsterId = '') {
  const intact = fortifications.filter(isFortificationBlocking);
  if (!intact.length) return null;
  const gateBreaker = /troll|slime|goblin/.test(monsterId);
  return intact.map((entry) => {
    const def = getFortificationDefinition(entry.type);
    const actorDistance = Math.hypot(entry.x - actorCell.x, entry.y - actorCell.y);
    const targetDistance = Math.hypot(entry.x - desiredCell.x, entry.y - desiredCell.y);
    const healthRatio = entry.health / entry.maxHealth;
    const gateBonus = isGate(entry) ? (gateBreaker ? -7 : -3) : 0;
    const priorityBonus = entry.priority ? 8 : 0;
    return { entry, score: actorDistance + targetDistance * 0.22 + healthRatio * 9 + entry.armour * 0.8 + gateBonus + priorityBonus };
  }).sort((a, b) => a.score - b.score)[0]?.entry || null;
}

export function chooseFortificationPassage(fortifications, actorCell, desiredCell) {
  return fortifications
    .filter((entry) => entry.state === 'breached' || (isGate(entry) && entry.open))
    .map((entry) => ({
      entry,
      score: Math.hypot(entry.x - actorCell.x, entry.y - actorCell.y)
        + Math.hypot(entry.x - desiredCell.x, entry.y - desiredCell.y) * 0.18,
    }))
    .sort((a, b) => a.score - b.score)[0]?.entry || null;
}

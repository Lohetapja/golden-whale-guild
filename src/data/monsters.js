export const MONSTERS = [
  {
    id: 'goblin_raider',
    name: 'Goblin Raider',
    assetKey: 'monster_goblin_raider',
    threat: 2,
    flavour: 'Demanded equal access to Premium Knees.',
  },
  {
    id: 'skeleton_attacker',
    name: 'Skeleton Attacker',
    assetKey: 'monster_skeleton_attacker',
    threat: 3,
    flavour: 'Already reduced to minimum viable staffing.',
  },
  {
    id: 'slime',
    name: 'Compliance Slime',
    assetKey: 'monster_slime',
    threat: 1,
    flavour: 'Absorbed three disclaimers and became management.',
  },
  {
    id: 'dungeon_bat',
    name: 'Dungeon Bat',
    assetKey: 'monster_dungeon_bat',
    threat: 1,
    flavour: 'Echolocates hidden service fees.',
  },
  {
    id: 'premium_goblin',
    name: 'Premium Goblin',
    assetKey: 'monster_premium_goblin',
    threat: 4,
    flavour: 'Arrived early through a priority tunnel.',
  },
  {
    id: 'debt_wraith',
    name: 'Debt Wraith',
    assetKey: 'monster_debt_wraith',
    threat: 5,
    flavour: 'The interest rate finally acquired a body.',
  },
  {
    id: 'refund_ghost',
    name: 'Refund Ghost',
    assetKey: 'monster_refund_ghost',
    threat: 3,
    flavour: 'Haunts the desk where hope was denied.',
  },
];

export function rollMonster() {
  return MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
}

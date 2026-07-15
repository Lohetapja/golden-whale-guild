const RECENT_LIMIT = 5;
const recentByPool = new Map();

const line = (text, options = {}) => ({ text, weight: 1, ...options });

function buildingPool(name, role, resource, failure, consequence) {
  return {
    description: [line(`${name}: ${role}. The brochure calls this civic momentum.`)],
    inspector: [line(`${name} provides ${role.toLowerCase()}. Results remain subject to roads, supplies, staffing, weather, and selective memory.`)],
    idle: [line(`${name} is idle. ${failure}`)],
    active: [line(`${name} is providing ${role.toLowerCase()} with professionally managed optimism.`)],
    success: [line(`${name} completed useful work. Accountability was not included in the batch.`)],
    failed_production: [line(`${name} failed to complete the batch. The inputs have been promoted to learning expenses.`)],
    no_resources: [line(`${name} needs ${resource}. Management has ordered a more confident empty shelf.`)],
    no_customers: [line(`${name} has no customers. Demand is expected immediately after closing time.`)],
    overcrowded: [line(`${name} is overcrowded. Capacity remains a number with excellent public relations.`)],
    damaged: [line(`${name} is damaged. The repair estimate has already developed a premium tier.`)],
    closed: [line(`${name} is closed. Essential work continues elsewhere, allegedly.`)],
    repaired: [line(`${name} was repaired. The original fault has been reclassified as architectural history.`)],
    upgraded: [line(`${name} expanded. ${consequence}`)],
    specialised: [line(`${name} selected a specialization. Flexibility has been converted into a more impressive sign.`)],
    premium_consequence: [line(`${name} accepted premium assistance. Output rose, trust fell, and the invoice achieved sentience.`)],
    town_log: [line(`${name} provided ${role.toLowerCase()} today. The council described this as unprecedented continuity.`)],
    week_report: [line(`${name} survived the week and delivered measurable ${role.toLowerCase()}. Several measurements were decorative.`)],
    report: [line(`${name} remained operational, which the council has recorded as strategic excellence.`)],
    rare: [line(`${name} passed inspection after the inspector agreed to stop looking.`, { weight: 0.18, rare: true })],
  };
}

export const BUILDING_SATIRE = Object.freeze({
  guildhall: {
    ...buildingPool('Guild Hall', 'quest administration', 'heroes willing to sign', 'Leadership is reviewing whose armour is cheapest.', 'Responsibility now has an upstairs office.'),
    active: [line('Leadership reviewed the crisis and assigned it to someone with lower armour.'), line('Three quests remain available. Survival remains a personal setting.'), line('The Guild accepts responsibility in principle and invoices by the hour.')],
  },
  tavern: buildingPool('Tavern', 'beds and morale', 'space, chairs, and plausible stew', 'Indoors is full and outdoors has begun charging rent.', 'Complaints can now be seated in two additional rooms.'),
  blacksmith: buildingPool('Blacksmith', 'gear production', 'iron', 'No iron. Producing excuses.', 'The forge gained capacity and several workplace hazards.'),
  training: {
    ...buildingPool('Training Yard', 'combat readiness', 'heroes prepared to sweat', 'The target dummy is winning by attendance.', 'Confidence now has footwork.'),
    active: [line('Heroes are learning that confidence is not a substitute for footwork.'), line('The target dummy has requested hazard pay.'), line('Four veterans now know which end of the sword is billable.')],
  },
  market: buildingPool('Market', 'loot conversion', 'loot and customers', 'Prices are moving despite the goods remaining perfectly still.', 'Another stall opened to sell items the town already owns.'),
  dungeon: buildingPool('Dungeon Gate', 'access to avoidable danger', 'heroes with poor judgment', 'The dungeon is open. Enthusiasm is sealed.', 'Danger can now enter the economy more efficiently.'),
  whale: {
    ...buildingPool('Golden Whale', 'premium convenience', 'premium salvage or disposable trust', 'The limited offer is resting between identical returns.', 'Trust was converted into a larger lobby.'),
    description: [line('The whale does not sell power. It sells the absence of waiting.'), line('All purchases are optional until the town begins losing.'), line('Fairness remains available in the free district.')],
    active: [line('A limited-time offer returned for the ninth consecutive season.'), line('The Station processed another voluntary emergency purchase.'), line('Convenience increased. The distinction from power became decorative.')],
    report: [line('Golden Whale revenue rose alongside several unrelated trust concerns.'), line('Premium growth exceeded forecasts and the moral load-bearing limit.')],
    rare: [line('The whale blinked. Legal insists this was a rendering issue.', { weight: 0.12, rare: true })],
  },
  inn: buildingPool('Inn', 'comfortable lodging', 'wood and vacant beds', 'The vacancy sign has entered a long-term relationship with zero.', 'The roof now covers selected premium corners.'),
  hero_hostel: {
    ...buildingPool('Hero Hostel', 'high-capacity lodging', 'beds and patience', 'Somebody is sleeping beside the furnace again.', 'Privacy has been postponed until the next tier.'),
    active: [line('Affordable lodging means the roof is included in selected rooms.'), line('Sixty-six beds, twenty-six heroes, and one unexplained furnace tenant.')],
  },
  premium_lodge: buildingPool('Premium Lodge', 'expensive rest', 'gold and social distance', 'The pillows are waiting for a hero with verified purchasing power.', 'Comfort improved faster than neighborhood morale.'),
  potion_shop: buildingPool('Potion Shop', 'injury treatment', 'herbs', 'No herbs. Bottling confidence instead.', 'Recovery gained a second shelf and a first disclaimer.'),
  mentor_hall: buildingPool('Mentor Hall', 'hero development', 'experienced heroes', 'Nobody is available to explain why experience hurts.', 'Advice now echoes from a larger room.'),
  watchtower: {
    ...buildingPool('Watchtower', 'early warning', 'an awake guard', 'The tower sees danger. Nobody sees the tower.', 'Visibility improved. Preparedness remains a separate purchase.'),
    active: [line('The guard detected danger and filed it alphabetically.'), line('The alarm was raised early enough for management to ignore it properly.')],
  },
  guard_post: buildingPool('Guard Post', 'local patrol response', 'healthy guards', 'The duty roster is an inspirational blank page.', 'Patrol coverage expanded to include more things worth worrying about.'),
  arena: buildingPool('Arena', 'public combat readiness', 'fighters and spectators', 'No bout today. The liability waiver is shadowboxing.', 'The crowd can now misunderstand tactics from better seats.'),
  bank_debt_office: buildingPool('Debt Office', 'cursed finance', 'borrowers with remaining hope', 'Interest is resting. Principal remains alert.', 'The repayment window gained bars.'),
  gem_exchange: buildingPool('Gem Exchange', 'secure gem trade', 'gems and liquidity', 'The vault is full of confidence and short on gems.', 'Security improved enough to make the fees nervous.'),
  convenience_office: buildingPool('Convenience Office', 'permits and shortcuts', 'paperwork', 'No forms remain except the form requesting more forms.', 'The queue gained a second window and no additional clerk.'),
  vip_lounge: buildingPool('VIP Lounge', 'exclusive hospitality', 'approved guests', 'The velvet rope is serving an empty room.', 'Exclusivity expanded to include more exclusion.'),
  lootbox_kiosk: buildingPool('Lootbox Kiosk', 'randomized disappointment', 'loot and optimism', 'The pity timer is taking a personal day.', 'The odds became smaller in a larger font.'),
  lumber_camp: buildingPool('Lumber Camp', 'wood extraction', 'harvestable forest', 'No trees in range. The axes are networking.', 'The forest can now become beds at industrial speed.'),
  mining_camp: buildingPool('Mining Camp', 'iron extraction', 'ore and miners', 'The vein is distant and morale is deeper.', 'More earth can now be moved into paperwork.'),
  herbalist_hut: buildingPool('Herbalist Hut', 'herb gathering', 'medicinal plants', 'The baskets are empty but smell reassuring.', 'The hut learned which weeds can be invoiced.'),
  salvage_camp: buildingPool('Salvage Camp', 'frontier recovery', 'ruins worth risking limbs for', 'Nothing nearby is broken enough to monetize.', 'Yesterday\'s catastrophe gained organized shelving.'),
  storehouse: buildingPool('Storehouse', 'raw storage', 'space', 'Storage is full. Production has been asked to feel less physical.', 'More shelves were added for objects nobody can find.'),
  frontier_outpost: buildingPool('Frontier Outpost', 'remote support', 'supplies and courage', 'The frontier is unsupported and taking notes.', 'Civilization advanced several metres and declared victory.'),
  sawmill: {
    ...buildingPool('Sawmill', 'plank production', 'wood', 'No logs. The saw is cutting operating costs.', 'The forest can now become regulation-sized rectangles faster.'),
    active: [line('Two logs entered. Several regulation-sized rectangles emerged.'), line('Sustainable forestry continues until the trees notice.')],
  },
  workshop: buildingPool('Workshop', 'tool production', 'planks and iron', 'No inputs. The hammers are workshopping a pivot.', 'Tools improved and safety became a legacy concern.'),
  salvage_yard: {
    ...buildingPool('Salvage Yard', 'loot processing', 'broken equipment', 'The warranty expired before the monster did.', 'Yesterday\'s catastrophe is today\'s refurbished equipment.'),
    active: [line('Nothing is truly broken while somebody poorer can still buy it.'), line('The yard converted tragedy into trade goods, minus narrative fees.')],
  },
  warehouse: buildingPool('Warehouse', 'finished-goods storage', 'empty capacity', 'The aisles are full and the manifest has become fiction.', 'A new wing was added for goods listed as somewhere.'),
  premium_fabricator: buildingPool('Premium Fabricator', 'questionable component production', 'premium salvage', 'The reactor lacks salvage and has begun processing ethics.', 'Output rose. Nearby envy achieved industrial scale.'),
  infirmary: buildingPool('Infirmary', 'injury recovery', 'herbs and potions', 'The beds are ready; the medicine is aspirational.', 'Treatment capacity grew faster than the casualty explanation.'),
  guard_barracks: buildingPool('Guard Barracks', 'guard readiness', 'healthy recruits', 'The bunks are made and the patrol boots are elsewhere.', 'Response time improved except during paperwork.'),
  monster_hunter_lodge: buildingPool('Monster Hunter Lodge', 'bounties and tracking', 'active lairs', 'No bounty is posted. The trophies look temporarily optimistic.', 'The hunters added a room for increasingly specific grudges.'),
  gravekeeper_hut: buildingPool('Gravekeeper Hut', 'burial and remains cleanup', 'time and shovels', 'No remains require attention. This counts as excellent news.', 'The town can now mourn at greater throughput.'),
  caravan_depot: buildingPool('Caravan Depot', 'carrier and escort support', 'cargo and road access', 'No route is ready. The carts are practicing stationary logistics.', 'Delivery capacity increased alongside theft attractiveness.'),
  loot_appraiser: buildingPool('Loot Appraiser', 'loot identification', 'unidentified loot', 'Nothing to appraise except the fee schedule.', 'More value can now be discovered after deductions.'),
  roadside_ad_board: buildingPool('Roadside Ad Board', 'ambient monetization', 'a road and an audience', 'Nobody is reading the offer. Visibility has been declared excellent.', 'The advertisement can now interrupt travel from two directions.'),
});

export const MONSTER_SATIRE = Object.freeze({
  loot_mimic: [
    'The chest contains one monster and a statistically insignificant chance of treasure.',
    'It was labelled guaranteed reward. The reward was dental trauma.',
    'The lid opened. So did the casualty report.',
    'The mimic selected the nearest greedy hero as its featured offer.',
    'Its teeth are cosmetic until the purchase completes.',
    'The chest is fleeing with somebody else\'s loot.',
    'Damage revealed a second, less convenient row of teeth.',
    'The reward preview has become hostile.',
    'The mimic died and unlocked the ability to resemble a normal chest.',
    'Broken hinges, splintered teeth, and no disclosed odds remain.',
    'The suspicious cache was a customer-acquisition funnel with claws.',
    'Weekly note: treasure attacked the people attempting to own it.',
  ],
  premium_slime: [
    'A basic slime with enhanced billing.', 'Gold residue, purple smoke, and unclear renewal terms approach.',
    'The slime is free to fight. Recovery is sold separately.', 'It is drifting toward premium output like a quarterly target.',
    'The residue lowers trust with excellent visual polish.', 'A guard struck it and received a complimentary stain.',
    'The slime absorbed the warning sign and became compliant.', 'It moves slowly because urgency costs extra.',
    'Premium slime collapsed into a puddle of transferable liability.', 'The residue glitters more confidently than it should.',
    'Its pit bubbles whenever corruption exceeds guidance.', 'Weekly note: premium fluidity became literal.'
  ],
  paywall_troll: [
    'The bridge is free. Continuing beyond the troll is not.', 'Access denied. Upgrade your armour plan.',
    'The troll accepts gold, heroes, or consumer-choice theatre.', 'It has selected a road junction for mandatory onboarding.',
    'Traffic is blocked pending a more expensive route.', 'The club is included in the base encounter.',
    'Heavy damage has not improved its terms.', 'The troll refuses to retreat from a monetizable choke point.',
    'The paywall fell. Access remains emotionally restricted.', 'Toll-gate debris marks the end of one compulsory journey.',
    'Its camp is a ruined gate with suspiciously current fees.', 'Weekly note: public access defeated private mass.'
  ],
  daily_login_ghoul: [
    'It returned because somebody forgot yesterday\'s reward.', 'Day seven grants a slightly larger ghoul.',
    'Missing one day reset the village survival streak.', 'The ghoul selected the hero with the weakest attendance record.',
    'One ghoul is weak. Seven constitute engagement.', 'It attacks at the exact time the player considered leaving.',
    'Damage reduced its streak but not its notification count.', 'The ghoul fled to preserve tomorrow\'s bonus.',
    'The login streak ended by force.', 'Its remains contain six stamps and no useful reward.',
    'The crypt records attendance more carefully than deaths.', 'Weekly note: recurring content recurred.'
  ],
  gacha_goblin: [
    'A goblin arrived with a sack full of other people\'s probabilities.', 'It can smell unattended cargo and poor impulse control.',
    'The goblin rolled a carrier and received rare theft.', 'Stolen goods have entered a limited extraction window.',
    'Its sack contains common loot and legendary confidence.', 'The goblin is retreating before the pity timer notices.',
    'Damage lowered its drop rate to visibly angry.', 'Guards are not featured on its preferred banner.',
    'The gacha goblin dropped everything except a clear explanation.', 'Spilled tokens have no exchange value outside regret.',
    'Its camp sorts stolen goods by invented rarity.', 'Weekly note: cargo ownership was randomized.'
  ],
  subscription_wraith: [
    'A recurring charge has acquired spectral form.', 'The wraith phases toward the most valuable service capacity.',
    'Morale will renew automatically unless cancelled in combat.', 'Its parchment chains contain no visible end date.',
    'The wraith drained a building and called it continued access.', 'Weapons pass through it; invoices do not.',
    'Damage exposed several grandfathered clauses.', 'It is fleeing without cancelling future appearances.',
    'The subscription expired with unusual finality.', 'Spectral residue remains billable for seven days.',
    'Its shrine is abandoned except for active terms.', 'Weekly note: recurring dread posted recurring results.'
  ],
  patch_note_necromancer: [
    'Skeleton durability increased based on player feedback.', 'The necromancer calls this a balance pass.',
    'Known issue: the dead continue moving.', 'It selected the grave-heavy district for live deployment.',
    'Old bones are being reintroduced as evergreen content.', 'The staff applies changes without a rollback plan.',
    'Damage notes describe this as intended behaviour.', 'The necromancer retreats to revise the encounter upward.',
    'The patch was reverted by overwhelming force.', 'Broken scrolls and unemployed bones remain.',
    'Its archive stores every complaint as a summoning component.', 'Weekly note: mortality received an unrequested update.'
  ],
  sponsored_bandit: [
    'This robbery is supported by an unnamed commercial partner.', 'The bandit targets carriers with excellent market fit.',
    'Your cargo may appear in promotional materials.', 'The branded sash provides no measurable armour.',
    'The market has been selected for a hostile collaboration.', 'Damage triggered a retreat clause.',
    'The bandit is fleeing with sponsored inventory.', 'Guards disrupted the activation campaign.',
    'The sponsorship ended when the bandit stopped moving.', 'Branded junk remains legally distinct from loot.',
    'Its camp contains stolen goods arranged for visibility.', 'Weekly note: theft achieved record impressions.'
  ],
});

function flattenPool(pool, context) {
  if (Array.isArray(pool)) return pool.map((text) => line(text));
  const exact = pool?.[context] || [];
  const fallback = context === 'rare' ? [] : [...(pool?.description || []), ...(pool?.report || [])];
  return [...exact, ...fallback].map((entry) => typeof entry === 'string' ? line(entry) : entry);
}

export function getSatireLine(domain, id, context = 'description', options = {}) {
  const source = domain === 'monster' ? MONSTER_SATIRE[id] : BUILDING_SATIRE[id];
  const candidates = flattenPool(source, context).filter((entry) => {
    if (entry.minDay && (options.day || 1) < entry.minDay) return false;
    if (entry.minStage && (options.stage || 0) < entry.minStage) return false;
    return true;
  });
  if (!candidates.length) return options.fallback || '';
  const key = `${domain}:${id}:${context}`;
  const recent = recentByPool.get(key) || [];
  const fresh = candidates.filter((entry) => !recent.includes(entry.text));
  const nonImmediate = candidates.filter((entry) => entry.text !== recent[recent.length - 1]);
  const pool = fresh.length ? fresh : nonImmediate.length ? nonImmediate : candidates;
  const total = pool.reduce((sum, entry) => sum + Math.max(0.01, entry.weight || 1), 0);
  let roll = (options.random?.() ?? Math.random()) * total;
  let selected = pool[pool.length - 1];
  for (const entry of pool) {
    roll -= Math.max(0.01, entry.weight || 1);
    if (roll <= 0) { selected = entry; break; }
  }
  recentByPool.set(key, [...recent, selected.text].slice(-RECENT_LIMIT));
  return selected.text;
}

export function resetSatireHistory() {
  recentByPool.clear();
}

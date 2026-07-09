const FIRST_NAMES = [
  'Mira', 'Chad', 'Nera', 'Pip', 'Sister Penny', 'Greg', 'Omen', 'Brisk',
  'Tilda', 'Harrold', 'Bella', 'Otto', 'Fennel', 'Lysa', 'Bram', 'Cora',
  'Venn', 'Della', 'Moss', 'Rook',
];

const SURNAMES = [
  'Copperboot', 'Fortuna', 'Nerfborne', 'Plankton', 'Beefwallet',
  'Pennytrain', 'Ironpatch', 'Patchley', 'Coinbelly', 'Receiptbane',
  'Queueborn', 'Debtwhisper', 'Grindwell', 'Patchnote', 'Bundleworth',
  'Goldthread', 'Hopeledger', 'Termswell', 'Lootward', 'Invoice',
];

const TITLES = {
  'Noble Whale': ['Lord', 'Lady', 'Duke', 'Duchess'],
  'Premium Monk': ['Brother', 'Sister'],
  Veteran: ['Captain', 'Veteran'],
  'Patch Notes Prophet': ['Prophet', 'Seer'],
};

function pick(list, random = Math.random) {
  return list[Math.floor(random() * list.length)];
}

export function generateHeroName(personality = '', random = Math.random) {
  const titlePool = TITLES[personality];
  const title = titlePool && random() < 0.72 ? `${pick(titlePool, random)} ` : '';
  return `${title}${pick(FIRST_NAMES, random)} ${pick(SURNAMES, random)}`;
}

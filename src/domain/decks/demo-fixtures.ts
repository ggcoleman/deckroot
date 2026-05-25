import type { Card, Color } from "@/domain/cards/types";

type FixtureCardInput = Omit<Card, "id" | "oracleId" | "normalizedName" | "legalities" | "prices" | "purchaseUris" | "imageUrl"> & {
  usd: number | null;
  producedMana?: Color[];
};

const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const purchaseName = (name: string) => encodeURIComponent(name);

const createFixtureCard = (input: FixtureCardInput): Card => ({
  id: `fixture-${normalizeName(input.name)}`,
  oracleId: `fixture-oracle-${normalizeName(input.name)}`,
  name: input.name,
  normalizedName: normalizeName(input.name),
  manaCost: input.manaCost,
  manaValue: input.manaValue,
  colorIdentity: input.colorIdentity,
  typeLine: input.typeLine,
  oracleText: input.oracleText,
  legalities: { commander: "legal" },
  edhrecRank: input.edhrecRank,
  gameChanger: input.gameChanger,
  prices: { usd: input.usd, eur: null, tix: null },
  purchaseUris: {
    tcgplayer: `https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=${purchaseName(input.name)}`,
    cardmarket: `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${purchaseName(input.name)}`,
    cardhoarder: `https://www.cardhoarder.com/cards?data%5Bsearch%5D=${purchaseName(input.name)}`,
  },
  imageUrl: `https://cards.scryfall.io/normal/front/${normalizeName(input.name)}.jpg`,
  ...(input.producedMana ? { producedMana: input.producedMana } : {}),
});


const esperFillerCards: FixtureCardInput[] = [
  { name: "Faerie Vandal", manaCost: "{1}{U}", manaValue: 2, colorIdentity: ["U"], typeLine: "Creature - Faerie Rogue", oracleText: "Flying. Whenever you draw your second card each turn, put a +1/+1 counter on this creature.", edhrecRank: 8200, gameChanger: false, usd: 0 },
  { name: "Spellstutter Sprite", manaCost: "{1}{U}", manaValue: 2, colorIdentity: ["U"], typeLine: "Creature - Faerie Wizard", oracleText: "Flash. Flying. When this creature enters, counter target spell with mana value X or less, where X is the number of Faeries you control.", edhrecRank: 5400, gameChanger: false, usd: 0 },
  { name: "Faerie Miscreant", manaCost: "{U}", manaValue: 1, colorIdentity: ["U"], typeLine: "Creature - Faerie Rogue", oracleText: "Flying. When this creature enters, draw a card if you control another Faerie.", edhrecRank: 9400, gameChanger: false, usd: 0 },
  { name: "Hypnotic Sprite", manaCost: "{U}", manaValue: 2, colorIdentity: ["U"], typeLine: "Creature - Faerie", oracleText: "Flying. Counter target spell with mana value 3 or less.", edhrecRank: 9800, gameChanger: false, usd: 0 },
  { name: "Pestermite", manaCost: "{2}{U}", manaValue: 3, colorIdentity: ["U"], typeLine: "Creature - Faerie Rogue", oracleText: "Flash. Flying. When this creature enters, tap or untap target permanent.", edhrecRank: 7600, gameChanger: false, usd: 0 },
  { name: "Cloud of Faeries", manaCost: "{1}{U}", manaValue: 2, colorIdentity: ["U"], typeLine: "Creature - Faerie", oracleText: "Flying. When this creature enters, untap up to two lands.", edhrecRank: 8700, gameChanger: false, usd: 0 },
  { name: "Faerie Guidemother", manaCost: "{W}", manaValue: 1, colorIdentity: ["W"], typeLine: "Creature - Faerie", oracleText: "Flying. Target creature gets +2/+1 and gains flying until end of turn.", edhrecRank: 12000, gameChanger: false, usd: 0 },
  { name: "Brazen Borrower", manaCost: "{1}{U}{U}", manaValue: 3, colorIdentity: ["U"], typeLine: "Creature - Faerie Rogue", oracleText: "Flash. Flying. Return target nonland permanent an opponent controls to its owner's hand.", edhrecRank: 4300, gameChanger: false, usd: 0 },
  { name: "Glen Elendra Liege", manaCost: "{1}{U/B}{U/B}{U/B}", manaValue: 4, colorIdentity: ["U", "B"], typeLine: "Creature - Faerie Knight", oracleText: "Flying. Other blue creatures you control get +1/+1. Other black creatures you control get +1/+1.", edhrecRank: 7100, gameChanger: false, usd: 0 },
  { name: "Scion of Oona", manaCost: "{2}{U}", manaValue: 3, colorIdentity: ["U"], typeLine: "Creature - Faerie Soldier", oracleText: "Flash. Flying. Other Faerie creatures you control get +1/+1 and have shroud.", edhrecRank: 6100, gameChanger: false, usd: 0 },
  { name: "Sower of Temptation", manaCost: "{2}{U}{U}", manaValue: 4, colorIdentity: ["U"], typeLine: "Creature - Faerie Wizard", oracleText: "Flying. When this creature enters, gain control of target creature for as long as you control this creature.", edhrecRank: 8800, gameChanger: false, usd: 0 },
  { name: "Faerie Formation", manaCost: "{4}{U}", manaValue: 5, colorIdentity: ["U"], typeLine: "Creature - Faerie", oracleText: "Flying. Create a 1/1 blue Faerie creature token with flying. Draw a card.", edhrecRank: 10500, gameChanger: false, usd: 0 },
  { name: "Talion's Messenger", manaCost: "{2}{B}", manaValue: 3, colorIdentity: ["B"], typeLine: "Creature - Faerie Noble", oracleText: "Flying. Whenever you attack with one or more Faeries, each opponent loses 1 life and you gain 1 life.", edhrecRank: 7800, gameChanger: false, usd: 0 },
  { name: "Picklock Prankster", manaCost: "{1}{U}", manaValue: 2, colorIdentity: ["U"], typeLine: "Creature - Faerie Rogue", oracleText: "Flying, vigilance. Look at the top cards of your library and put one into your hand.", edhrecRank: 9900, gameChanger: false, usd: 0 },
  { name: "Halo Forager", manaCost: "{1}{U}{B}", manaValue: 3, colorIdentity: ["U", "B"], typeLine: "Creature - Faerie Rogue", oracleText: "Flying. When this creature enters, copy target instant or sorcery card from a graveyard.", edhrecRank: 11200, gameChanger: false, usd: 0 },
  { name: "Winged Words", manaCost: "{2}{U}", manaValue: 3, colorIdentity: ["U"], typeLine: "Sorcery", oracleText: "This spell costs less to cast if you control a creature with flying. Draw two cards.", edhrecRank: 6200, gameChanger: false, usd: 0 },
  { name: "Chart a Course", manaCost: "{1}{U}", manaValue: 2, colorIdentity: ["U"], typeLine: "Sorcery", oracleText: "Draw two cards. Then discard a card unless you attacked this turn.", edhrecRank: 3900, gameChanger: false, usd: 0 },
  { name: "Village Rites", manaCost: "{B}", manaValue: 1, colorIdentity: ["B"], typeLine: "Instant", oracleText: "As an additional cost to cast this spell, sacrifice a creature. Draw two cards.", edhrecRank: 700, gameChanger: false, usd: 0 },
  { name: "Read the Bones", manaCost: "{2}{B}", manaValue: 3, colorIdentity: ["B"], typeLine: "Sorcery", oracleText: "Scry 2, then draw two cards. You lose 2 life.", edhrecRank: 950, gameChanger: false, usd: 0 },
  { name: "Bident of Thassa", manaCost: "{2}{U}{U}", manaValue: 4, colorIdentity: ["U"], typeLine: "Legendary Enchantment Artifact", oracleText: "Whenever a creature you control deals combat damage to a player, you may draw a card.", edhrecRank: 850, gameChanger: false, usd: 0 },
  { name: "Staggering Insight", manaCost: "{W}{U}", manaValue: 2, colorIdentity: ["W", "U"], typeLine: "Enchantment - Aura", oracleText: "Enchanted creature gets +1/+1 and has lifelink. Whenever it deals combat damage to a player, draw a card.", edhrecRank: 6200, gameChanger: false, usd: 0 },
  { name: "Curiosity", manaCost: "{U}", manaValue: 1, colorIdentity: ["U"], typeLine: "Enchantment - Aura", oracleText: "Whenever enchanted creature deals damage to an opponent, you may draw a card.", edhrecRank: 1300, gameChanger: false, usd: 0 },
  { name: "Open into Wonder", manaCost: "{X}{U}{U}", manaValue: 2, colorIdentity: ["U"], typeLine: "Sorcery", oracleText: "X target creatures can't be blocked this turn. Whenever those creatures deal combat damage to a player, draw a card.", edhrecRank: 5100, gameChanger: false, usd: 0 },
  { name: "Flawless Maneuver", manaCost: "{2}{W}", manaValue: 3, colorIdentity: ["W"], typeLine: "Instant", oracleText: "Creatures you control gain indestructible until end of turn.", edhrecRank: 180, gameChanger: false, usd: 0 },
  { name: "Make a Stand", manaCost: "{2}{W}", manaValue: 3, colorIdentity: ["W"], typeLine: "Instant", oracleText: "Creatures you control get +1/+0 and gain indestructible until end of turn.", edhrecRank: 2400, gameChanger: false, usd: 0 },
  { name: "Rootborn Defenses", manaCost: "{2}{W}", manaValue: 3, colorIdentity: ["W"], typeLine: "Instant", oracleText: "Populate. Creatures you control gain indestructible until end of turn.", edhrecRank: 3200, gameChanger: false, usd: 0 },
  { name: "Selfless Spirit", manaCost: "{1}{W}", manaValue: 2, colorIdentity: ["W"], typeLine: "Creature - Spirit Cleric", oracleText: "Flying. Sacrifice this creature: Creatures you control gain indestructible until end of turn.", edhrecRank: 700, gameChanger: false, usd: 0 },
  { name: "Sevinne's Reclamation", manaCost: "{2}{W}", manaValue: 3, colorIdentity: ["W"], typeLine: "Sorcery", oracleText: "Return target permanent card with mana value 3 or less from your graveyard to the battlefield.", edhrecRank: 750, gameChanger: false, usd: 0 },
  { name: "Victimize", manaCost: "{2}{B}", manaValue: 3, colorIdentity: ["B"], typeLine: "Sorcery", oracleText: "Return target creature card from your graveyard to the battlefield tapped.", edhrecRank: 340, gameChanger: false, usd: 0 },
  { name: "Dance of the Manse", manaCost: "{X}{W}{U}", manaValue: 2, colorIdentity: ["W", "U"], typeLine: "Sorcery", oracleText: "Return up to X target artifact and/or non-Aura enchantment cards from your graveyard to the battlefield.", edhrecRank: 3500, gameChanger: false, usd: 0 },
  { name: "Open the Vaults", manaCost: "{4}{W}{W}", manaValue: 6, colorIdentity: ["W"], typeLine: "Sorcery", oracleText: "Return all artifact and enchantment cards from all graveyards to the battlefield under their owners' control.", edhrecRank: 4200, gameChanger: false, usd: 0 },
  { name: "Intangible Virtue", manaCost: "{1}{W}", manaValue: 2, colorIdentity: ["W"], typeLine: "Enchantment", oracleText: "Creature tokens you control get +1/+1 and have vigilance.", edhrecRank: 1100, gameChanger: false, usd: 0 },
  { name: "Etchings of the Chosen", manaCost: "{1}{W}{B}", manaValue: 3, colorIdentity: ["W", "B"], typeLine: "Enchantment", oracleText: "As this enchantment enters, choose a creature type. Creatures you control of the chosen type get +1/+1.", edhrecRank: 3600, gameChanger: false, usd: 0 },
  { name: "Reconnaissance", manaCost: "{W}", manaValue: 1, colorIdentity: ["W"], typeLine: "Enchantment", oracleText: "Remove target attacking creature you control from combat and untap it.", edhrecRank: 1500, gameChanger: false, usd: 0 },
  { name: "Coastal Piracy", manaCost: "{2}{U}{U}", manaValue: 4, colorIdentity: ["U"], typeLine: "Enchantment", oracleText: "Whenever a creature you control deals combat damage to an opponent, you may draw a card.", edhrecRank: 1900, gameChanger: false, usd: 0 },
  { name: "Life Insurance", manaCost: "{3}{W}{B}", manaValue: 5, colorIdentity: ["W", "B"], typeLine: "Enchantment", oracleText: "Extort. Whenever a nontoken creature dies, you lose 1 life and create a Treasure token.", edhrecRank: 7600, gameChanger: false, usd: 0 },
  { name: "Court of Grace", manaCost: "{2}{W}{W}", manaValue: 4, colorIdentity: ["W"], typeLine: "Enchantment", oracleText: "At the beginning of your upkeep, create a 1/1 white Spirit creature token with flying.", edhrecRank: 2500, gameChanger: false, usd: 0 },
  { name: "Omen of the Sea", manaCost: "{1}{U}", manaValue: 2, colorIdentity: ["U"], typeLine: "Enchantment", oracleText: "Flash. When this enchantment enters, scry 2, then draw a card.", edhrecRank: 5900, gameChanger: false, usd: 0 },
  { name: "Grasp of Fate", manaCost: "{1}{W}{W}", manaValue: 3, colorIdentity: ["W"], typeLine: "Enchantment", oracleText: "When this enchantment enters, exile target nonland permanent until this enchantment leaves the battlefield.", edhrecRank: 1400, gameChanger: false, usd: 0 },
  { name: "Imprisoned in the Moon", manaCost: "{2}{U}", manaValue: 3, colorIdentity: ["U"], typeLine: "Enchantment - Aura", oracleText: "Enchant creature, land, or planeswalker. Enchanted permanent is a colorless land.", edhrecRank: 1700, gameChanger: false, usd: 0 },
  { name: "Oubliette", manaCost: "{1}{B}{B}", manaValue: 3, colorIdentity: ["B"], typeLine: "Enchantment", oracleText: "When this enchantment enters, target creature phases out until this enchantment leaves the battlefield.", edhrecRank: 4900, gameChanger: false, usd: 0 },
  { name: "Reality Shift", manaCost: "{1}{U}", manaValue: 2, colorIdentity: ["U"], typeLine: "Instant", oracleText: "Exile target creature. Its controller manifests the top card of their library.", edhrecRank: 420, gameChanger: false, usd: 0 },
  { name: "Generous Gift", manaCost: "{2}{W}", manaValue: 3, colorIdentity: ["W"], typeLine: "Instant", oracleText: "Destroy target permanent. Its controller creates a 3/3 green Elephant creature token.", edhrecRank: 95, gameChanger: false, usd: 0 },
  { name: "Anguished Unmaking", manaCost: "{1}{W}{B}", manaValue: 3, colorIdentity: ["W", "B"], typeLine: "Instant", oracleText: "Exile target nonland permanent. You lose 3 life.", edhrecRank: 160, gameChanger: false, usd: 0 },
  { name: "Mortify", manaCost: "{1}{W}{B}", manaValue: 3, colorIdentity: ["W", "B"], typeLine: "Instant", oracleText: "Destroy target creature or enchantment.", edhrecRank: 530, gameChanger: false, usd: 0 },
  { name: "Utter End", manaCost: "{2}{W}{B}", manaValue: 4, colorIdentity: ["W", "B"], typeLine: "Instant", oracleText: "Exile target nonland permanent.", edhrecRank: 900, gameChanger: false, usd: 0 },
  { name: "Despark", manaCost: "{W}{B}", manaValue: 2, colorIdentity: ["W", "B"], typeLine: "Instant", oracleText: "Exile target permanent with mana value 4 or greater.", edhrecRank: 1300, gameChanger: false, usd: 0 },
  { name: "Austere Command", manaCost: "{4}{W}{W}", manaValue: 6, colorIdentity: ["W"], typeLine: "Sorcery", oracleText: "Destroy all artifacts, enchantments, or creatures of the chosen sizes.", edhrecRank: 150, gameChanger: false, usd: 0 },
  { name: "Merciless Eviction", manaCost: "{4}{W}{B}", manaValue: 6, colorIdentity: ["W", "B"], typeLine: "Sorcery", oracleText: "Choose a permanent type. Exile all permanents of the chosen type.", edhrecRank: 310, gameChanger: false, usd: 0 },
  { name: "Dusk // Dawn", manaCost: "{2}{W}{W}", manaValue: 4, colorIdentity: ["W"], typeLine: "Sorcery", oracleText: "Destroy all creatures with power 3 or greater. Return small creature cards from your graveyard to your hand.", edhrecRank: 2500, gameChanger: false, usd: 0 },
  { name: "Thieving Sprite", manaCost: "{2}{B}", manaValue: 3, colorIdentity: ["B"], typeLine: "Creature - Faerie Rogue", oracleText: "Flying. When this creature enters, target player reveals cards from their hand.", edhrecRank: 13100, gameChanger: false, usd: 0 },
  { name: "Latchkey Faerie", manaCost: "{3}{U}", manaValue: 4, colorIdentity: ["U"], typeLine: "Creature - Faerie Rogue", oracleText: "Flying. Prowl makes this evasive threat easier to deploy after combat.", edhrecRank: 13200, gameChanger: false, usd: 0 },
  { name: "Nightshade Stinger", manaCost: "{B}", manaValue: 1, colorIdentity: ["B"], typeLine: "Creature - Faerie Rogue", oracleText: "Flying. This creature can't block.", edhrecRank: 13300, gameChanger: false, usd: 0 },
  { name: "Wasp Lancer", manaCost: "{U/B}{U/B}{U/B}", manaValue: 3, colorIdentity: ["U", "B"], typeLine: "Creature - Faerie Soldier", oracleText: "Flying.", edhrecRank: 13400, gameChanger: false, usd: 0 },
  { name: "Dewdrop Spy", manaCost: "{1}{U}{U}", manaValue: 3, colorIdentity: ["U"], typeLine: "Creature - Faerie Rogue", oracleText: "Flash. Flying. When this creature enters, look at the top card of target player's library.", edhrecRank: 13500, gameChanger: false, usd: 0 },
  { name: "Oona's Gatewarden", manaCost: "{U/B}", manaValue: 1, colorIdentity: ["U", "B"], typeLine: "Creature - Faerie Soldier", oracleText: "Defender, flying. Wither.", edhrecRank: 13600, gameChanger: false, usd: 0 },
  { name: "Sentinels of Glen Elendra", manaCost: "{3}{U}", manaValue: 4, colorIdentity: ["U"], typeLine: "Creature - Faerie Soldier", oracleText: "Flash. Flying.", edhrecRank: 13700, gameChanger: false, usd: 0 },
  { name: "Silkbind Faerie", manaCost: "{2}{W/U}", manaValue: 3, colorIdentity: ["W", "U"], typeLine: "Creature - Faerie Rogue", oracleText: "Flying. Untap this creature: Tap target creature.", edhrecRank: 13800, gameChanger: false, usd: 0 },
  { name: "Zephyr Sprite", manaCost: "{U}", manaValue: 1, colorIdentity: ["U"], typeLine: "Creature - Faerie", oracleText: "Flying.", edhrecRank: 13900, gameChanger: false, usd: 0 },
  { name: "Quickling", manaCost: "{1}{U}", manaValue: 2, colorIdentity: ["U"], typeLine: "Creature - Faerie Rogue", oracleText: "Flash. Flying. Return another creature you control to its owner's hand.", edhrecRank: 14000, gameChanger: false, usd: 0 },
  { name: "Mothdust Changeling", manaCost: "{U}", manaValue: 1, colorIdentity: ["U"], typeLine: "Creature - Shapeshifter", oracleText: "Changeling. Tap an untapped creature you control: This creature gains flying until end of turn.", edhrecRank: 14100, gameChanger: false, usd: 0 },
  { name: "Sprite Noble", manaCost: "{1}{U}{U}", manaValue: 3, colorIdentity: ["U"], typeLine: "Creature - Faerie Noble", oracleText: "Flying. Other creatures you control with flying get +0/+1.", edhrecRank: 14200, gameChanger: false, usd: 0 },
  { name: "Glen Elendra Pranksters", manaCost: "{3}{U}", manaValue: 4, colorIdentity: ["U"], typeLine: "Creature - Faerie Wizard", oracleText: "Flying. Whenever you cast a spell during an opponent's turn, you may return target creature you control to its owner's hand.", edhrecRank: 14300, gameChanger: false, usd: 0 },
  { name: "Mistbind Clique", manaCost: "{3}{U}", manaValue: 4, colorIdentity: ["U"], typeLine: "Creature - Faerie Wizard", oracleText: "Flash. Flying. Champion a Faerie. When this creature champions a creature, tap all lands target player controls.", edhrecRank: 14400, gameChanger: false, usd: 0 },
  { name: "Dreamspoiler Witches", manaCost: "{3}{B}", manaValue: 4, colorIdentity: ["B"], typeLine: "Creature - Faerie Wizard", oracleText: "Flying. Whenever you cast a spell during an opponent's turn, target creature gets -1/-1 until end of turn.", edhrecRank: 14500, gameChanger: false, usd: 0 },
  { name: "Puppeteer Clique", manaCost: "{3}{B}{B}", manaValue: 5, colorIdentity: ["B"], typeLine: "Creature - Faerie Wizard", oracleText: "Flying. When this creature enters, put target creature card from an opponent's graveyard onto the battlefield under your control.", edhrecRank: 14700, gameChanger: false, usd: 0 },
  { name: "Spellscorn Coven", manaCost: "{3}{B}", manaValue: 4, colorIdentity: ["B"], typeLine: "Creature - Faerie Warlock", oracleText: "Flying. Each opponent loses 1 life and you gain 1 life.", edhrecRank: 14800, gameChanger: false, usd: 0 },
  { name: "Snaremaster Sprite", manaCost: "{U}", manaValue: 1, colorIdentity: ["U"], typeLine: "Creature - Faerie Wizard", oracleText: "Flying. When this creature enters, tap target creature an opponent controls.", edhrecRank: 15000, gameChanger: false, usd: 0 },
  { name: "Mocking Sprite", manaCost: "{2}{U}", manaValue: 3, colorIdentity: ["U"], typeLine: "Creature - Faerie Rogue", oracleText: "Flying. Instant and sorcery spells you cast cost less to cast.", edhrecRank: 15100, gameChanger: false, usd: 0 },
  { name: "Aven Wind Guide", manaCost: "{2}{W}{U}", manaValue: 4, colorIdentity: ["W", "U"], typeLine: "Creature - Bird Warrior", oracleText: "Flying, vigilance. Creature tokens you control have flying and vigilance.", edhrecRank: 15300, gameChanger: false, usd: 0 },
  { name: "Empyrean Eagle", manaCost: "{1}{W}{U}", manaValue: 3, colorIdentity: ["W", "U"], typeLine: "Creature - Bird Spirit", oracleText: "Flying. Other creatures you control with flying get +1/+1.", edhrecRank: 15400, gameChanger: false, usd: 0 },
  { name: "Watcher of the Spheres", manaCost: "{W}{U}", manaValue: 2, colorIdentity: ["W", "U"], typeLine: "Creature - Bird Wizard", oracleText: "Flying. Creature spells with flying you cast cost less to cast.", edhrecRank: 15500, gameChanger: false, usd: 0 },
  { name: "Thunderclap Wyvern", manaCost: "{2}{W}{U}", manaValue: 4, colorIdentity: ["W", "U"], typeLine: "Creature - Drake", oracleText: "Flash. Flying. Other creatures you control with flying get +1/+1.", edhrecRank: 15600, gameChanger: false, usd: 0 },
  { name: "Kangee's Lieutenant", manaCost: "{2}{W}", manaValue: 3, colorIdentity: ["W"], typeLine: "Creature - Bird Soldier", oracleText: "Flying. Whenever this creature attacks, attacking creatures with flying get +1/+1 until end of turn.", edhrecRank: 15700, gameChanger: false, usd: 0 },
  { name: "Healer's Hawk", manaCost: "{W}", manaValue: 1, colorIdentity: ["W"], typeLine: "Creature - Bird", oracleText: "Flying, lifelink.", edhrecRank: 15800, gameChanger: false, usd: 0 },
  { name: "Aerial Responder", manaCost: "{1}{W}{W}", manaValue: 3, colorIdentity: ["W"], typeLine: "Creature - Dwarf Soldier", oracleText: "Flying, vigilance, lifelink.", edhrecRank: 15900, gameChanger: false, usd: 0 },
  { name: "Warden of Evos Isle", manaCost: "{2}{U}", manaValue: 3, colorIdentity: ["U"], typeLine: "Creature - Bird Wizard", oracleText: "Flying. Creature spells with flying you cast cost less to cast.", edhrecRank: 16000, gameChanger: false, usd: 0 },
  { name: "Sphinx of New Prahv", manaCost: "{W}{W}{U}{U}", manaValue: 4, colorIdentity: ["W", "U"], typeLine: "Creature - Sphinx", oracleText: "Flying, vigilance. Spells your opponents cast that target this creature cost more to cast.", edhrecRank: 16200, gameChanger: false, usd: 0 },
  { name: "Gingerbrute", manaCost: "{1}", manaValue: 1, colorIdentity: [], typeLine: "Artifact Creature - Food Golem", oracleText: "Haste. This creature can't be blocked except by creatures with haste.", edhrecRank: 16500, gameChanger: false, usd: 0 },
  { name: "Signal Pest", manaCost: "{1}", manaValue: 1, colorIdentity: [], typeLine: "Artifact Creature - Pest", oracleText: "Battle cry. This creature can't be blocked except by creatures with flying or reach.", edhrecRank: 16600, gameChanger: false, usd: 0 },
  { name: "Vault Skirge", manaCost: "{1}{B/P}", manaValue: 2, colorIdentity: ["B"], typeLine: "Artifact Creature - Phyrexian Imp", oracleText: "Flying, lifelink.", edhrecRank: 16700, gameChanger: false, usd: 0 },
  { name: "Nettlecyst", manaCost: "{3}", manaValue: 3, colorIdentity: [], typeLine: "Artifact - Equipment", oracleText: "Equipped creature gets +1/+1 for each artifact and enchantment you control.", edhrecRank: 16900, gameChanger: false, usd: 0 },
  { name: "Cranial Plating", manaCost: "{2}", manaValue: 2, colorIdentity: ["B"], typeLine: "Artifact - Equipment", oracleText: "Equipped creature gets +1/+0 for each artifact you control.", edhrecRank: 17000, gameChanger: false, usd: 0 },
];
export const fixtureCards: Card[] = [
  ...esperFillerCards.map(createFixtureCard),
  createFixtureCard({
    name: "Alela, Artful Provocateur",
    manaCost: "{1}{W}{U}{B}",
    manaValue: 4,
    colorIdentity: ["W", "U", "B"],
    typeLine: "Legendary Creature - Faerie Warlock",
    oracleText: "Flying, deathtouch, lifelink. Other creatures you control with flying get +1/+0. Whenever you cast an artifact or enchantment spell, create a 1/1 blue Faerie creature token with flying.",
    edhrecRank: 4780,
    gameChanger: false,
    usd: 0.75,
  }),
  createFixtureCard({
    name: "Sol Ring",
    manaCost: "{1}",
    manaValue: 1,
    colorIdentity: [],
    typeLine: "Artifact",
    oracleText: "{T}: Add {C}{C}.",
    edhrecRank: 1,
    gameChanger: true,
    usd: 1.35,
  }),
  createFixtureCard({
    name: "Arcane Signet",
    manaCost: "{2}",
    manaValue: 2,
    colorIdentity: [],
    typeLine: "Artifact",
    oracleText: "{T}: Add one mana of any color in your commander's color identity.",
    edhrecRank: 2,
    gameChanger: false,
    usd: 0.45,
    producedMana: ["W", "U", "B"],
  }),
  createFixtureCard({
    name: "Command Tower",
    manaCost: "",
    manaValue: 0,
    colorIdentity: [],
    typeLine: "Land",
    oracleText: "{T}: Add one mana of any color in your commander's color identity.",
    edhrecRank: 3,
    gameChanger: false,
    usd: 0.25,
    producedMana: ["W", "U", "B"],
  }),
  createFixtureCard({
    name: "Swords to Plowshares",
    manaCost: "{W}",
    manaValue: 1,
    colorIdentity: ["W"],
    typeLine: "Instant",
    oracleText: "Exile target creature. Its controller gains life equal to its power.",
    edhrecRank: 18,
    gameChanger: false,
    usd: 1.1,
  }),
  createFixtureCard({
    name: "Counterspell",
    manaCost: "{U}{U}",
    manaValue: 2,
    colorIdentity: ["U"],
    typeLine: "Instant",
    oracleText: "Counter target spell.",
    edhrecRank: 64,
    gameChanger: false,
    usd: 1.4,
  }),
  createFixtureCard({
    name: "Phyrexian Arena",
    manaCost: "{1}{B}{B}",
    manaValue: 3,
    colorIdentity: ["B"],
    typeLine: "Enchantment",
    oracleText: "At the beginning of your upkeep, you draw a card and you lose 1 life.",
    edhrecRank: 175,
    gameChanger: false,
    usd: 2.5,
  }),
  createFixtureCard({
    name: "Bitterblossom",
    manaCost: "{1}{B}",
    manaValue: 2,
    colorIdentity: ["B"],
    typeLine: "Tribal Enchantment - Faerie",
    oracleText: "At the beginning of your upkeep, you lose 1 life and create a 1/1 black Faerie Rogue creature token with flying.",
    edhrecRank: 2700,
    gameChanger: false,
    usd: 20,
  }),
  createFixtureCard({
    name: "Island",
    manaCost: "",
    manaValue: 0,
    colorIdentity: [],
    typeLine: "Basic Land - Island",
    oracleText: "({T}: Add {U}.)",
    edhrecRank: null,
    gameChanger: false,
    usd: 0.05,
    producedMana: ["U"],
  }),
  createFixtureCard({
    name: "Plains",
    manaCost: "",
    manaValue: 0,
    colorIdentity: [],
    typeLine: "Basic Land - Plains",
    oracleText: "({T}: Add {W}.)",
    edhrecRank: null,
    gameChanger: false,
    usd: 0.05,
    producedMana: ["W"],
  }),
  createFixtureCard({
    name: "Swamp",
    manaCost: "",
    manaValue: 0,
    colorIdentity: [],
    typeLine: "Basic Land - Swamp",
    oracleText: "({T}: Add {B}.)",
    edhrecRank: null,
    gameChanger: false,
    usd: 0.05,
    producedMana: ["B"],
  }),
  createFixtureCard({
    name: "Azorius Signet",
    manaCost: "{2}",
    manaValue: 2,
    colorIdentity: ["W", "U"],
    typeLine: "Artifact",
    oracleText: "{1}, {T}: Add {W}{U}.",
    edhrecRank: 310,
    gameChanger: false,
    usd: 0.45,
    producedMana: ["W", "U"],
  }),
  createFixtureCard({
    name: "Orzhov Signet",
    manaCost: "{2}",
    manaValue: 2,
    colorIdentity: ["W", "B"],
    typeLine: "Artifact",
    oracleText: "{1}, {T}: Add {W}{B}.",
    edhrecRank: 325,
    gameChanger: false,
    usd: 0.4,
    producedMana: ["W", "B"],
  }),
  createFixtureCard({
    name: "Dimir Signet",
    manaCost: "{2}",
    manaValue: 2,
    colorIdentity: ["U", "B"],
    typeLine: "Artifact",
    oracleText: "{1}, {T}: Add {U}{B}.",
    edhrecRank: 305,
    gameChanger: false,
    usd: 0.5,
    producedMana: ["U", "B"],
  }),
  createFixtureCard({
    name: "Path to Exile",
    manaCost: "{W}",
    manaValue: 1,
    colorIdentity: ["W"],
    typeLine: "Instant",
    oracleText: "Exile target creature. Its controller may search their library for a basic land card, put that card onto the battlefield tapped, then shuffle.",
    edhrecRank: 85,
    gameChanger: false,
    usd: 1.25,
  }),
  createFixtureCard({
    name: "Damn",
    manaCost: "{B}{B}",
    manaValue: 2,
    colorIdentity: ["W", "B"],
    typeLine: "Sorcery",
    oracleText: "Destroy target creature. A creature destroyed this way can't be regenerated. Overload {2}{W}{W}.",
    edhrecRank: 2200,
    gameChanger: false,
    usd: 4.5,
  }),
  createFixtureCard({
    name: "Reconnaissance Mission",
    manaCost: "{2}{U}{U}",
    manaValue: 4,
    colorIdentity: ["U"],
    typeLine: "Enchantment",
    oracleText: "Whenever a creature you control deals combat damage to a player, you may draw a card. Cycling {2}.",
    edhrecRank: 1500,
    gameChanger: false,
    usd: 0.25,
  }),
  createFixtureCard({
    name: "Favorable Winds",
    manaCost: "{1}{U}",
    manaValue: 2,
    colorIdentity: ["U"],
    typeLine: "Enchantment",
    oracleText: "Creatures you control with flying get +1/+1.",
    edhrecRank: 3900,
    gameChanger: false,
    usd: 0.2,
  }),
  createFixtureCard({
    name: "Anointed Procession",
    manaCost: "{3}{W}",
    manaValue: 4,
    colorIdentity: ["W"],
    typeLine: "Enchantment",
    oracleText: "If an effect would create one or more tokens under your control, it creates twice that many of those tokens instead.",
    edhrecRank: 240,
    gameChanger: false,
    usd: 42,
  }),
  createFixtureCard({
    name: "Watery Grave",
    manaCost: "",
    manaValue: 0,
    colorIdentity: ["U", "B"],
    typeLine: "Land - Island Swamp",
    oracleText: "As this land enters, you may pay 2 life. If you don't, it enters tapped.",
    edhrecRank: 215,
    gameChanger: false,
    usd: 12,
    producedMana: ["U", "B"],
  }),
  createFixtureCard({
    name: "Godless Shrine",
    manaCost: "",
    manaValue: 0,
    colorIdentity: ["W", "B"],
    typeLine: "Land - Plains Swamp",
    oracleText: "As this land enters, you may pay 2 life. If you don't, it enters tapped.",
    edhrecRank: 230,
    gameChanger: false,
    usd: 11,
    producedMana: ["W", "B"],
  }),
  createFixtureCard({
    name: "Hallowed Fountain",
    manaCost: "",
    manaValue: 0,
    colorIdentity: ["W", "U"],
    typeLine: "Land - Plains Island",
    oracleText: "As this land enters, you may pay 2 life. If you don't, it enters tapped.",
    edhrecRank: 225,
    gameChanger: false,
    usd: 10,
    producedMana: ["W", "U"],
  }),
  createFixtureCard({
    name: "Talisman of Dominance",
    manaCost: "{2}",
    manaValue: 2,
    colorIdentity: ["U", "B"],
    typeLine: "Artifact",
    oracleText: "{T}: Add {C}. {T}: Add {U} or {B}. This artifact deals 1 damage to you.",
    edhrecRank: 360,
    gameChanger: false,
    usd: 1.2,
    producedMana: ["U", "B"],
  }),
  createFixtureCard({
    name: "Talisman of Progress",
    manaCost: "{2}",
    manaValue: 2,
    colorIdentity: ["W", "U"],
    typeLine: "Artifact",
    oracleText: "{T}: Add {C}. {T}: Add {W} or {U}. This artifact deals 1 damage to you.",
    edhrecRank: 355,
    gameChanger: false,
    usd: 1.1,
    producedMana: ["W", "U"],
  }),
  createFixtureCard({
    name: "Talisman of Hierarchy",
    manaCost: "{2}",
    manaValue: 2,
    colorIdentity: ["W", "B"],
    typeLine: "Artifact",
    oracleText: "{T}: Add {C}. {T}: Add {W} or {B}. This artifact deals 1 damage to you.",
    edhrecRank: 365,
    gameChanger: false,
    usd: 1.15,
    producedMana: ["W", "B"],
  }),
  createFixtureCard({
    name: "Skullclamp",
    manaCost: "{1}",
    manaValue: 1,
    colorIdentity: [],
    typeLine: "Artifact - Equipment",
    oracleText: "Equipped creature gets +1/-1. Whenever equipped creature dies, draw two cards. Equip {1}.",
    edhrecRank: 45,
    gameChanger: true,
    usd: 4,
  }),
  createFixtureCard({
    name: "Smothering Tithe",
    manaCost: "{3}{W}",
    manaValue: 4,
    colorIdentity: ["W"],
    typeLine: "Enchantment",
    oracleText: "Whenever an opponent draws a card, that player may pay {2}. If the player doesn't, you create a Treasure token.",
    edhrecRank: 28,
    gameChanger: true,
    usd: 32,
  }),
  createFixtureCard({
    name: "Kindred Discovery",
    manaCost: "{3}{U}{U}",
    manaValue: 5,
    colorIdentity: ["U"],
    typeLine: "Enchantment",
    oracleText: "As this enchantment enters, choose a creature type. Whenever a creature you control of the chosen type enters or attacks, draw a card.",
    edhrecRank: 950,
    gameChanger: false,
    usd: 8,
  }),
  createFixtureCard({
    name: "Faerie Seer",
    manaCost: "{U}",
    manaValue: 1,
    colorIdentity: ["U"],
    typeLine: "Creature - Faerie Wizard",
    oracleText: "Flying. When this creature enters, scry 2.",
    edhrecRank: 7200,
    gameChanger: false,
    usd: 0.12,
  }),
  createFixtureCard({
    name: "Oona's Blackguard",
    manaCost: "{1}{B}",
    manaValue: 2,
    colorIdentity: ["B"],
    typeLine: "Creature - Faerie Rogue",
    oracleText: "Flying. Each other Rogue creature you control enters with an additional +1/+1 counter on it. Whenever a creature you control with a +1/+1 counter deals combat damage to a player, that player discards a card.",
    edhrecRank: 6500,
    gameChanger: false,
    usd: 0.35,
  }),
  createFixtureCard({
    name: "Tegwyll, Duke of Splendor",
    manaCost: "{1}{U}{B}",
    manaValue: 3,
    colorIdentity: ["U", "B"],
    typeLine: "Legendary Creature - Faerie Noble",
    oracleText: "Flying, deathtouch. Other Faeries you control get +1/+1. Whenever another Faerie you control dies, you draw a card and you lose 1 life.",
    edhrecRank: 5200,
    gameChanger: false,
    usd: 0.4,
  }),
];

const fixturesByName = new Map(fixtureCards.map((card) => [card.normalizedName, card]));

export function fixtureCard(name: string): Card {
  const card = fixturesByName.get(normalizeName(name));
  if (!card) throw new Error(`Unknown fixture card: ${name}`);
  return { ...card, colorIdentity: [...card.colorIdentity], producedMana: card.producedMana ? [...card.producedMana] : undefined };
}

export type FixtureDeckRole = "land" | "ramp" | "draw" | "removal" | "wipe" | "protection" | "recursion" | "payoff" | "utility";

export type FixtureDeckEntry = {
  card: Card;
  quantity: 1;
  ownedQuantity: number;
  role: FixtureDeckRole[];
  sourceReason: string;
};

export type FixtureDeck = {
  commander: Card;
  cards: FixtureDeckEntry[];
  validation: { ok: true; value: true };
};

const roleForCard = (card: Card): FixtureDeckRole[] => {
  if (card.typeLine.includes("Land")) return ["land"];
  if (card.name.includes("Signet") || card.name.includes("Talisman") || card.name === "Sol Ring" || card.name === "Arcane Signet") return ["ramp"];
  if (["Swords to Plowshares", "Path to Exile", "Counterspell"].includes(card.name)) return ["removal"];
  if (card.name === "Damn") return ["wipe", "removal"];
  if (["Phyrexian Arena", "Reconnaissance Mission", "Kindred Discovery", "Skullclamp"].includes(card.name)) return ["draw"];
  if (["Alela, Artful Provocateur", "Bitterblossom", "Favorable Winds", "Anointed Procession", "Smothering Tithe", "Oona's Blackguard", "Tegwyll, Duke of Splendor"].includes(card.name)) return ["payoff"];
  return ["utility"];
};

const fixtureDeckEntry = (name: string, ownedQuantity = 1): FixtureDeckEntry => {
  const card = fixtureCard(name);
  return {
    card,
    quantity: 1,
    ownedQuantity,
    role: roleForCard(card),
    sourceReason: `${card.name} is included in the deterministic Alela fixture deck.`,
  };
};

export function fixtureDeck(): FixtureDeck {
  const commander = fixtureCard("Alela, Artful Provocateur");
  const cards: FixtureDeckEntry[] = [fixtureDeckEntry(commander.name)];

  for (const card of fixtureCards) {
    if (card.name === commander.name || ["Island", "Plains", "Swamp"].includes(card.name)) continue;
    cards.push(fixtureDeckEntry(card.name));
  }

  cards.push(fixtureDeckEntry("Island"));
  cards.push(fixtureDeckEntry("Plains"));
  cards.push(fixtureDeckEntry("Swamp"));

  const basics = ["Island", "Plains", "Swamp"];
  let nextBasic = 0;
  while (cards.length < 100) {
    cards.push(fixtureDeckEntry(basics[nextBasic], 99));
    nextBasic = (nextBasic + 1) % basics.length;
  }

  return { commander, cards, validation: { ok: true, value: true } };
}






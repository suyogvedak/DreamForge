// fantasyData.js — runtime banks + generators (fantasy)
// Usage: import fa from './data/fantasyData.js'; fa.generateBatch('weapon',100);

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uid = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random()*10000)}`;

/* BANKS */
export const fa_givenNames = ["Aelina","Borin","Cedric","Darys","Eldra","Finnan","Gwyn","Helga","Ithar","Jun","Kelda","Lorien","Maelor","Neris","Odrin"];
export const fa_surnames = ["Stonehelm","Ravenshire","Oakenshield","Highwater","Stormvale","Ironroot","Silverkeep","Windrider","Duskmantle"];
export const fa_races = ["Human","Elf","Dwarf","Halfling","Gnome","Orc","Tiefling","Dragonborn","Aasimar"];
export const fa_classes = ["Fighter","Rogue","Wizard","Cleric","Ranger","Paladin","Bard","Druid","Monk","Warlock"];
export const fa_settlements = ["Amberfall","Greyhaven","Stonebridge","Eversong","Crowford","Thornfield","Moonspire"];
export const fa_landmarks = ["Whispering Falls","Sunken Ruins","The Obsidian Gate","Temple of Hollow Stars","The Shattered Keep"];
export const fa_magicItems = ["Sword of Dawnbreak","Cloak of Mist","Ring of Echoes","Amulet of Forgotten Kings","Wand of the North Wind"];
export const fa_weaponBases = ["Longsword","Shortbow","Warhammer","Dagger","Greatsword","Spear","Staff"];
export const fa_weaponMaterials = ["steel","mythril","obsidian","ironwood","runed bronze"];
export const fa_weaponEnchantments = ["flame","frost","light","shadow","life-drain","holy-bane"];
export const fa_weaponRarities = ["common","fine","enchanted","legendary","cursed"];
export const fa_worldTypes = ["Kingdom","Freehold","Hidden Vale","Ruined Realm","Island Duchy"];
export const fa_biomes = ["Temperate Forest","Mountainous","Marsh","Coastal","Arid Plains"];
export const fa_techLevels = ["Feudal","Arcane","Proto-Industrial"];
export const fa_conflicts = ["Dynastic Claim","Old Curse","Bandit Uprising","Dragon Threat"];

export function generateCharacter() {
  const name = `${rnd(fa_givenNames)} ${rnd(fa_surnames)}`;
  const race = rnd(fa_races);
  const cls = rnd(fa_classes);
  return {
    id: uid("fa_char"),
    name,
    race,
    class: cls,
    role: cls,
    background: `${name} hails from ${rnd(fa_settlements)} and was trained as a ${cls.toLowerCase()}.`,
    appearance: `${rnd(["weathered cloak","braided hair","runic tattoos","scarred forearm","green eyes"])}`,
    gear: [rnd(fa_magicItems), `${cls} Kit`],
    shortDescription: `${name} — a ${race} ${cls.toLowerCase()} of quiet conviction.`
  };
}

export function generateLocation() {
  const name = `${rnd(fa_landmarks)} of ${rnd(["the East","the Deep","the Vale","the Moon"])}`;
  return { id: uid("fa_loc"), name, type: rnd(["Town","Ancient Ruin","Forest","Temple"]), description: `${name}: ${rnd(fa_landmarks)} near ${rnd(fa_settlements)}.` };
}

export function generateItem() {
  return { id: uid("fa_item"), name: rnd(fa_magicItems), category: "Magic Item", spec: { enchantment: rnd(["light","shadow","healing","protection"]) }, use: `${rnd(fa_magicItems)} grants speculative effects.` };
}

export function generateWeapon() {
  const base = rnd(fa_weaponBases);
  const mat = rnd(fa_weaponMaterials);
  const ench = rnd(fa_weaponEnchantments);
  const rarity = rnd(fa_weaponRarities);
  const damageDice = `${1 + Math.floor(Math.random()*3)}d${[6,8,10][Math.floor(Math.random()*3)]}`;
  return {
    id: uid("fa_weapon"),
    name: `${ench.charAt(0).toUpperCase()+ench.slice(1)} ${base}`,
    base,
    material: mat,
    category: base.toLowerCase().includes("bow") ? "Ranged" : (base.toLowerCase().includes("staff") ? "Magic" : "Melee"),
    damageDice,
    weightKg: +(Math.random()*6 + 0.8).toFixed(2),
    rarity,
    enchantment: ench,
    specialEffects: [`${ench} burst on hit`],
    description: `${ench.charAt(0).toUpperCase()+ench.slice(1)} ${base} made of ${mat}; ${ench} enchantment.`
  };
}

export function generateWorld() {
  const name = `${rnd(["Elden","Amber","Thorn","Fallow","High"])} ${rnd(["Hold","Vale","Keep","Shire","Cross"])}`;
  return {
    id: uid("fa_world"),
    name,
    type: rnd(fa_worldTypes),
    biome: rnd(fa_biomes),
    techLevel: rnd(fa_techLevels),
    population: `${Math.ceil(Math.random()*2)}k-${Math.ceil(Math.random()*50)}k`,
    dominantCulture: rnd(["Feudal lords","Clan holds","Merchant guilds","Temple orders"]),
    conflicts: [rnd(fa_conflicts)],
    notableLandmarks: [rnd(fa_landmarks), rnd(fa_landmarks)],
    primaryResources: rnd(["timber","ore","herbal lore","enchanted stone"]),
    shortDescription: `${name} — a ${rnd(fa_biomes).toLowerCase()} realm with old magics.`
  };
}

export function generateQuest() {
  return { id: uid("fa_q"), title: rnd(["Blight on the Marsh","The Lost Heirloom","The Broken Sigil"]), brief: "A pressing matter requires intervention.", objectives: ["Investigate","Confront","Resolve"], hooks: [rnd(["Moral choice","Ancient magic","Faction intrigue"])] };
}

export function generateStory(characterName) {
  const name = characterName || `${rnd(fa_givenNames)} ${rnd(fa_surnames)}`;
  const p1 = `${rnd(["A bell tolled at midnight.","The river ran slow and black."])} ${rnd(["Children dreamt of the past.","A bargain was struck."])}`;
  const p2 = `${rnd(["They followed a map.","A blade was forged.","A bargain shifted fate."])}`;
  return { id: uid("fa_story"), title: `Tale of ${name}`, text: `${p1}\n\n${p2}` };
}

/* BATCH HELPER */
export function generateBatch(type, n = 10) {
  const out = [];
  for (let i = 0; i < n; i++) {
    if (type === "character") out.push(generateCharacter());
    else if (type === "location") out.push(generateLocation());
    else if (type === "item") out.push(generateItem());
    else if (type === "quest") out.push(generateQuest());
    else if (type === "story") out.push(generateStory());
    else if (type === "weapon") out.push(generateWeapon());
    else if (type === "world") out.push(generateWorld());
    else throw new Error("Unknown type");
  }
  return out;
}

export default {
  fa_givenNames, fa_surnames, fa_races, fa_classes, fa_settlements, fa_landmarks, fa_magicItems,
  fa_weaponBases, fa_weaponMaterials, fa_weaponEnchantments, fa_weaponRarities, fa_worldTypes, fa_biomes, fa_techLevels, fa_conflicts,
  generateCharacter, generateLocation, generateItem, generateQuest, generateStory, generateWeapon, generateWorld, generateBatch
};

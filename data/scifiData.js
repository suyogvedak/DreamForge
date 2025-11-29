// scifiData.js — runtime banks + generators (sci-fi)
// Usage: import sf from './data/scifiData.js'; sf.generateBatch('weapon',100);

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uid = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random()*10000)}`;

/* BANKS */
export const sf_firstNames = ["Astra","Orin","Zara","Kellan","Mira","Talon","Reza","Nova","Ivo","Rhea","Soren","Tess","Vega","Kai"];
export const sf_lastNames  = ["Archer","Voss","Calix","Meridian","Quellar","Stroud","Kade","Sol","Trask","Idera"];
export const sf_species = ["Human","Cyborg","Synth","Xelari","Aurian","Terran Hybrid","Biolume","Android"];
export const sf_roles = ["Pilot","Scientist","Engineer","Exobiologist","Smuggler","Navigator","Diplomat","Marshal","Scout","Medic"];
export const sf_starSystems = ["Elys Prime","Vera Sigma","Orion's Wake","Kepler Station","Iota Rim","Helix Expanse","Nyx Belt","Cepheus Arc"];
export const sf_itemNames = ["Fusion Core","Gravity Well Drive","Nanomesh Fabricator","Aether Compressor","Quantum Beacon","Neuro-emitters","EM Beacon","Personal Shield","Cryo Capsule"];
export const sf_weaponBases = ["Pulse Pistol","Railcarbine","Fusion Lance","Plasma Cutter","Gauss Cannon","VX Blade"];
export const sf_weaponCategories = ["Kinetic","Energy","Plasma","Electro","Melee"];
export const sf_weaponTechs = ["standard-tapped","overcharged","nanocoil","quantum-augmented"];
export const sf_weaponRarities = ["standard","advanced","prototype","naval","black-market"];
export const sf_planetTypes = ["Terra","Desert","Gas Giant","Ice World","Oceanic","Barren"];
export const sf_colonyTypes = ["Orbital Hub","Mining Colony","Research Outpost","Terraform Station"];
export const sf_conflicts = ["Corporate bidding","AI experiment breach","Resource extraction dispute","Smuggler blockade"];
export const sf_questTemplates = [
  { title: "Distress on Nyx-3", brief: "An unregistered distress beacon points to a research outpost where experiments went wrong." },
  { title: "Smuggler's Run", brief: "Transport illegal bio-samples past orbital blockades." },
  { title: "Archive Fragment", brief: "Retrieve a fragment of an archive containing terraform schematics." }
];
export const sf_storyFragments = {
  opening: ["Astra accepted a courier job she couldn't refuse.","On approach to Kepler Station, the radio spat static and secrets.","The hull creaked as old engines pushed through the Helix Expanse."],
  complication: ["Derelicts drift with their histories intact.","The fragment whispered of corporate plans.","Scanners returned impossible signatures."],
  stakes: ["Selling the fragment could fund years of payments.","Leaking it would spark war.","Holding it alone meant guilt."]
};

/* GENERATORS */
export function generateCharacter() {
  const name = `${rnd(sf_firstNames)} ${rnd(sf_lastNames)}`;
  return {
    id: uid("sf_char"),
    name,
    species: rnd(sf_species),
    role: rnd(sf_roles),
    background: `${name} served on ${rnd(sf_starSystems)} before turning freelance.`,
    appearance: `${rnd(["patched flight jacket","holographic tattoo","implanted ocular grid","mechanical hand"])}`,
    gear: [rnd(sf_itemNames), `${rnd(sf_roles)} Kit`],
    shortDescription: `${name} — a ${rnd(["resourceful","cold","charismatic"])} operator of the lanes.`
  };
}

export function generateLocation() {
  return {
    id: uid("sf_loc"),
    name: `${rnd(sf_starSystems)} Outpost ${Math.floor(Math.random()*300)}`,
    type: rnd(["Orbital Hub","Desert Planet","Research Colony","Mining Platform","Ice Station"]),
    description: `A ${rnd(["crowded","dilapidated","well-guarded"])} hub in ${rnd(sf_starSystems)}`
  };
}

export function generateItem() {
  const n = rnd(sf_itemNames);
  return { id: uid("sf_item"), name: n, category: rnd(["Power","BioTech","Ship Module","Weapon"]), spec: { rating: Math.ceil(Math.random()*10) }, use: `Used for ${rnd(["power","propulsion","neural sync","defense"])}` };
}

export function generateWeapon() {
  const base = rnd(sf_weaponBases);
  const category = rnd(sf_weaponCategories);
  const tech = rnd(sf_weaponTechs);
  const rarity = rnd(sf_weaponRarities);
  const damageDice = `${1 + Math.floor(Math.random()*4)}d${[6,8,10,12][Math.floor(Math.random()*4)]}`;
  return {
    id: uid("sf_weapon"),
    name: `${base} ${Math.floor(Math.random()*900)}`,
    baseModel: base,
    category,
    tech,
    damageDice,
    damageType: rnd(["kinetic","plasma","energy","thermal"]),
    rangeMeters: Math.round(Math.random()*2000 + (category==="Melee" ? 1 : 50)),
    massKg: +(Math.random()*80 + 0.5).toFixed(2),
    rarity,
    specialEffects: [rnd(["shield-piercing","overheat-burst","stasis-field","EMP pulse"])],
    description: `${base} (${tech}) — ${rarity}. ${rnd(["Used by marines","Favored by raiders","Common on cargo ships"])}`
  };
}

export function generateWorld() {
  const name = `${rnd(["Elys","Vera","Orion","Kepler","Iota","Helix","Nyx","Cepheus"])} ${rnd(["Prime","Sigma","V","Station","Basin","Arc"])}`;
  return {
    id: uid("sf_world"),
    name,
    kind: rnd([...sf_planetTypes, ...sf_colonyTypes]),
    starSystem: rnd(sf_starSystems),
    planetType: rnd(sf_planetTypes),
    dominantIndustry: rnd(["mining","terraforming","research","trade","military"]),
    populationMillions: +(Math.random()*300 + 0.1).toFixed(2),
    governance: rnd(["Corporate Charter","Colonial Council","AI Steward"]),
    conflicts: [rnd(sf_conflicts)],
    notableFeatures: [rnd(["floating mines","orbital yards","ancient ruins","ice canyons"])],
    shortDescription: `${name} — a hub in ${rnd(sf_starSystems)} with ${rnd(["heavy industry","secret labs","smuggling routes"])}.`
  };
}

export function generateQuest() {
  const t = rnd(sf_questTemplates);
  return { id: uid("sf_q"), title: t.title, brief: t.brief, objectives: ["Find","Secure","Report"], hooks: [rnd(["Corporate coverup","Unknown biology"])] };
}

export function generateStory(characterName) {
  const name = characterName || `${rnd(sf_firstNames)} ${rnd(sf_lastNames)}`;
  const p1 = `${rnd(sf_storyFragments.opening)} ${rnd(sf_storyFragments.complication)} ${rnd(sf_storyFragments.stakes)}`;
  const p2 = `${rnd(["They hide the fragment","They sell it","They warn an ally"])}.`;
  return { id: uid("sf_story"), title: `Echoes of ${name}`, text: `${p1}\n\n${p2}` };
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
  sf_firstNames, sf_lastNames, sf_species, sf_roles, sf_starSystems, sf_itemNames, sf_weaponBases, sf_weaponCategories, sf_weaponTechs, sf_weaponRarities,
  sf_planetTypes, sf_colonyTypes, sf_conflicts, sf_questTemplates, sf_storyFragments,
  generateCharacter, generateLocation, generateItem, generateQuest, generateStory, generateWeapon, generateWorld, generateBatch
};

// cyberpunkData.js — runtime banks + generators (cyberpunk)
// Usage: import cp from './data/cyberpunkData.js'; cp.generateBatch('character',100);

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uid = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random()*10000)}`;

/* BANKS */
export const cp_firstNames = ["Nova","Rex","Iris","Jax","Mira","Zeke","Vera","Knox","Luna","Raven","Kai","Sable","Orion","Nyx","Kade","Zola","Drift","Rook","Faye","Brix"];
export const cp_lastNames  = ["Black","Voss","Kincaid","Ryder","Hale","Sato","Valen","Drake","Cross","Morrow","Quinn","Zen","Silva","Archer"];
export const cp_handles_pre = ["Neo","Byte","Zero","Ghost","Dark","Cryo","Hex","Glitch","Pulse","Vibe","Edge"];
export const cp_handles_suf = ["Runner","Net","Shade","Core","Blade","Hack","Node","Wave","Proxy","Cipher"];
export const cp_roles = ["Netrunner","Fixer","Solo","Techie","Corporate Spy","Street Doc","Smuggler","Media Hacker","Drone Pilot"];
export const cp_corporations = ["NeuroDyne Systems","Axiom Dynamics","Helix Bioworks","Zenith Solutions","OptiCore","LumenTek"];
export const cp_districts = ["Neon Market","Glass Spires","Old Docklands","Shadow Alley","Upper Lattice","Subterrane","Skyline Plaza"];
export const cp_landmarks = ["Neon Bazaar","Augment Clinic","Skybridge 9","The Black Clinic","Glass Vault Station","The Undergrid","Byte Tower"];
export const cp_cyberware = ["Optical HUD","Neural Uplink","Arm Reinforcement","Subdermal Armor","Skinjack Interface","Audio Enhancer","Adrenal Boost","Biofilter Lungs","Targeting Assistant"];
export const cp_weapons = ["Smart Pistol","Railcarbine","Mono-knife","Plasma Cutter","Shock Baton","Gauss Rifle","EMP Grenade","Nano-swarm","Pulse SMG"];
export const cp_gadgets = ["Deck Mk.II","Signal Scrambler","Ghost Drive","Disposable Burner","Cloak Patch","Nanoseal Kit","Holo-Emitter"];
export const cp_questTemplates = [
  { title: "Prototype Extraction", brief: "Steal a prototype implant from a corporate research tower.", tags:["heist","corp"] },
  { title: "Ghost in the Grid", brief: "Investigate a rogue AI recruiting via implants.", tags:["ai","moral"] },
  { title: "Neon Market Job", brief: "Hijack a shipment in the Neon Market.", tags:["gang","smuggle"] },
  { title: "Backdoor Exposure", brief: "Find and decide what to do with a backdoor in mass-implants.", tags:["reveal","ethics"] }
];
export const cp_storyFragments = {
  opening: [
    "When {name} found the backdoor, nothing was the same.",
    "A single line of code split loyalties across an entire district.",
    "Neon puddles reflected a ledger that belonged to someone else."
  ],
  complication: [
    "Corporate hunters traced the signature faster than expected.",
    "An ally's offer smelled of betrayal.",
    "The implant carried someone else's memories."
  ],
  stakes: [
    "Exposing it frees thousands but collapses markets.",
    "Selling it guarantees wealth but costs lives.",
    "Turning it off silences a voice that still remembers."
  ]
};

/* GENERATORS */
export function generateCharacter() {
  const first = rnd(cp_firstNames);
  const last = rnd(cp_lastNames);
  const name = `${first} ${last}`;
  const role = rnd(cp_roles);
  return {
    id: uid("cp_char"),
    name,
    handle: `${rnd(cp_handles_pre)}${rnd(cp_handles_suf)}`,
    role,
    background: `${name} grew up in the ${rnd(cp_districts)} and learned ${role.toLowerCase()} work on the streets.`,
    appearance: `${rnd(["neon-tinted hair","augmented eye","tattooed circuitry","chrome arm","scar across jaw"])}`,
    cyberware: [rnd(cp_cyberware), rnd(cp_cyberware)],
    gear: [rnd(cp_gadgets), rnd(cp_weapons)],
    shortDescription: `${name} — a ${role.toLowerCase()} who trades in secrets.`
  };
}

export function generateLocation() {
  const name = `${rnd(cp_landmarks)} ${Math.floor(Math.random()*300)}`;
  return {
    id: uid("cp_loc"),
    name,
    type: rnd(["Black Market District","Corporate Quarter","Undercity","Docklands","Outpost"]),
    description: `${name}: ${rnd(["heavy surveillance","open bazaar","hidden alleys","controlled access"])} in ${rnd(cp_districts)}.`
  };
}

export function generateItem() {
  const model = `${rnd(cp_gadgets)} Mk.${Math.floor(Math.random()*900)+100}`;
  return {
    id: uid("cp_item"),
    name: model,
    category: rnd(["Hardware","Gadget","Weapon","Consumable"]),
    spec: { model, rating: Math.ceil(Math.random()*10) },
    use: `${rnd(["Used to jam signals","Used for infiltration","Used for crowd control","Used to boost reaction time"])}`
  };
}

/* Weapon generator */
export function generateWeapon() {
  const base = rnd(cp_weapons);
  const material = rnd(["poly-alloy","ceramic composite","titanium alloy","carbon-fiber","nanomesh"]);
  const special = rnd(["smart-targeting","armor-piercing rounds","silenced discharge","overclocked coil","EMP dampener"]);
  const rarity = rnd(["common","uncommon","rare","prototype","black-market"]);
  const damageDice = `${Math.ceil(Math.random()*3)}d${[6,8,10,12][Math.floor(Math.random()*4)]}`;
  return {
    id: uid("cp_weapon"),
    name: `${base} ${Math.floor(Math.random()*900)}`,
    baseModel: base,
    material,
    damageDice,
    damageType: rnd(["kinetic","energy","electro","pierce","slash"]),
    rangeMeters: Math.round(Math.random()*300 + (base.toLowerCase().includes("knife") ? 1 : 10)),
    weightKg: +(Math.random()*6 + 0.5).toFixed(2),
    rarity,
    techLevel: rnd(["High-corporate","Mid-tech","Blacktech"]),
    specialEffects: [special],
    description: `${base} built from ${material} — ${special}.`
  };
}

/* World generator */
export function generateWorld() {
  const name = `${rnd(["Neo","New","Eclipse","Nova","Iron","Aurora"])} ${rnd(["District","Reach","Sprawl","Ring","Basin"])}`;
  return {
    id: uid("cp_world"),
    name,
    type: rnd(["Megacity","Orbital Habitat","Industrial Sprawl","Undercity","Corporate Enclave","Smuggler Hub"]),
    biome: rnd(["Urban Neon","Rusted Industrial","Vertical Slums","Sky Gardens","Subterranean Complex"]),
    techLevel: rnd(["High-corporate","Mid-tech","Experimental","Blacktech"]),
    populationMillions: +(Math.random()*20 + 0.5).toFixed(2),
    dominantCulture: rnd(["Corporate technocracy","Street clans","Syndicate-lord factions","Nomad guilds"]),
    conflicts: [rnd(["Corp turf war","AI uprising","Resource scarcity","Smuggler feud","Quarantine enforcement"])],
    notableLandmarks: [rnd(cp_landmarks), rnd(cp_landmarks)],
    primaryResources: rnd(["data hubs","synthetic organics","rare alloys","energy cores"]),
    governance: rnd(["Corporate council","Militia coalition","Black market oligarchs","Municipal corporation"]),
    shortDescription: `${name} — a ${rnd(["neon","metallic","glass"])} sprawl governed by corporate interests.`
  };
}

export function generateQuest() {
  const t = rnd(cp_questTemplates);
  return {
    id: uid("cp_q"),
    title: t.title,
    brief: t.brief,
    objectives: ["Recon","Infiltrate","Exfiltrate"],
    hooks: t.tags
  };
}

export function generateStory(characterName) {
  const name = characterName || `${rnd(cp_firstNames)} ${rnd(cp_lastNames)}`;
  const opening = rnd(cp_storyFragments.opening).replace("{name}", name);
  const para1 = `${opening} ${rnd(cp_storyFragments.complication)} ${rnd(cp_storyFragments.stakes)}`;
  const para2 = `${rnd(["They vanished into the undergrid.","A drone followed their code.","They uploaded a burner and ran."])} ${rnd(["Sirens howled in the distance.","A fixer watched from shadow."])}`;
  return { id: uid("cp_story"), title: `Neon Thread: ${name}`, text: `${para1}\n\n${para2}` };
}

/* BATCH HELPER (supports character/location/item/quest/story/weapon/world) */
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
  // banks
  cp_firstNames, cp_lastNames, cp_handles_pre, cp_handles_suf, cp_roles, cp_corporations,
  cp_districts, cp_landmarks, cp_cyberware, cp_weapons, cp_gadgets, cp_questTemplates, cp_storyFragments,
  // generators
  generateCharacter, generateLocation, generateItem, generateQuest, generateStory, generateWeapon, generateWorld, generateBatch
};

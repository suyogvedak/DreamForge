// generators/weaponGen.js
// Attempt runtime generator first, then fallback to dataset assembly.

import { formatOutput, pickRandom, importDataModule } from "./commonUtils.js";
import * as fantasyData from "../data/fantasyData.js";
import * as cyberpunkData from "../data/cyberpunkData.js";
import * as scifiData from "../data/scifiData.js";

/* choose dataset based on theme */
function datasetFor(theme) {
  const t = String(theme || "fantasy").toLowerCase();
  if (t === "cyberpunk") return cyberpunkData;
  if (t === "scifi") return scifiData;
  return fantasyData;
}

/* Try runtime generator */
async function tryRuntime(theme) {
  const mod = await importDataModule(theme);
  if (mod && typeof mod.generateWeapon === "function") {
    try {
      return await mod.generateWeapon();
    } catch (e) {
      console.warn("[weaponGen] runtime generateWeapon failed:", e && e.message ? e.message : e);
      return null;
    }
  }
  return null;
}

/* Legacy fallback assembly */
function legacyAssemble(theme) {
  const ds = datasetFor(theme);
  const base = pickRandom(ds.fa_weaponBases || ds.cp_weaponBases || ds.sf_weaponBases || ["Weapon"]);
  const material = pickRandom(ds.fa_weaponMaterials || ds.cp_weaponBases || ["steel"]);
  const enchant = pickRandom(ds.fa_weaponEnchantments || ds.cp_weaponBases || ["standard"]);
  const title = `${enchant ? (String(enchant).charAt(0).toUpperCase() + String(enchant).slice(1) + " ") : ""}${base}`;
  const description = `A ${theme} style ${base} made of ${material}. ${enchant ? "Enchantment: " + enchant + "." : ""}`;
  return { name: title, text: description, description, type: "weapon" };
}

export default async function generateWeapon(theme = "fantasy") {
  // 1) try runtime
  const runtime = await tryRuntime(theme);
  if (runtime && typeof runtime === "object") {
    return formatOutput("weapon", runtime, { theme, source: "runtime" });
  }

  // 2) legacy fallback
  const out = legacyAssemble(theme);
  return formatOutput("weapon", out, { theme, source: "fallback" });
}

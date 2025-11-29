// models/characterModelMap.js

export const characterModelMap = {
  fantasy: {
    mage: {
      emerald_enclave: "models/fantasy/mage-emerald.glb",
      shadow_blade: "models/fantasy/mage-shadow.glb"
    },
    warrior: {
      crimson_clan: "models/fantasy/warrior-crimson.glb",
      iron_guard: "models/fantasy/warrior-iron.glb"
    }
  },
  cyberpunk: {
    hacker: {
      neon_syndicate: "models/cyberpunk/hacker-neon.glb",
      chrome_collective: "models/cyberpunk/hacker-chrome.glb"
    },
    enforcer: {
      overwatch: "models/cyberpunk/enforcer-overwatch.glb",
      cyber_ops: "models/cyberpunk/enforcer-cyber.glb"
    }
  },
  scifi: {
    pilot: {
      nova_alliance: "models/scifi/pilot-nova.glb",
      xeno_command: "models/scifi/pilot-xeno.glb"
    },
    sentinel: {
      core_unity: "models/scifi/sentinel-core.glb",
      rogue_ai: "models/scifi/sentinel-rogue.glb"
    }
  }
};

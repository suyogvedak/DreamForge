// models/weaponModelMap.js

export const weaponModelMap = {
  fantasy: {
    sword: {
      enchanted: "models/fantasy/sword-enchanted.glb",
      cursed: "models/fantasy/sword-cursed.glb"
    },
    bow: {
      ancient: "models/fantasy/bow-ancient.glb",
      frost: "models/fantasy/bow-frost.glb"
    }
  },
  cyberpunk: {
    pistol: {
      plasma: "models/cyberpunk/pistol-plasma.glb",
      ion: "models/cyberpunk/pistol-ion.glb"
    },
    rifle: {
      laser: "models/cyberpunk/rifle-laser.glb",
      kinetic: "models/cyberpunk/rifle-kinetic.glb"
    }
  },
  scifi: {
    blaster: {
      antimatter: "models/scifi/blaster-antimatter.glb",
      particle: "models/scifi/blaster-particle.glb"
    },
    railgun: {
      fusion: "models/scifi/railgun-fusion.glb",
      dark_matter: "models/scifi/railgun-darkmatter.glb"
    }
  }
};

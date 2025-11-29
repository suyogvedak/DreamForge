// generators/cyberpunkGen.js
import { generateCharacter } from './characterGen.js';
import { generateWorld } from './worldGen.js';
import { generateWeapon } from './weaponGen.js';
import { generateQuest } from './questGen.js';
import { generateStory } from './storyGen.js';
import { formatOutput } from './commonUtils.js';

export async function generateCyberpunk(type, params = {}, userContext = {}) {
  switch (type) {
    case 'character':
      return await generateCharacter({ ...params, theme: 'Cyberpunk' }, userContext);
    case 'world':
      return await generateWorld({ ...params, theme: 'Cyberpunk' }, userContext);
    case 'weapon':
      return await generateWeapon({ ...params, theme: 'Cyberpunk' }, userContext);
    case 'quest':
      return await generateQuest({ ...params, theme: 'Cyberpunk' }, userContext);
    case 'story':
      return await generateStory({ ...params, theme: 'Cyberpunk' }, userContext);
    default:
      return formatOutput(type, 'Unknown Cyberpunk Output', 'Unsupported type for Cyberpunk.', { theme: 'Cyberpunk' });
  }
}

// generators/scifiGen.js
import { generateCharacter } from './characterGen.js';
import { generateWorld } from './worldGen.js';
import { generateWeapon } from './weaponGen.js';
import { generateQuest } from './questGen.js';
import { generateStory } from './storyGen.js';
import { formatOutput } from './commonUtils.js';

export async function generateScifi(type, params = {}, userContext = {}) {
  switch (type) {
    case 'character':
      return await generateCharacter({ ...params, theme: 'Scifi' }, userContext);
    case 'world':
      return await generateWorld({ ...params, theme: 'Scifi' }, userContext);
    case 'weapon':
      return await generateWeapon({ ...params, theme: 'Scifi' }, userContext);
    case 'quest':
      return await generateQuest({ ...params, theme: 'Scifi' }, userContext);
    case 'story':
      return await generateStory({ ...params, theme: 'Scifi' }, userContext);
    default:
      return formatOutput(type, 'Unknown Sci-Fi Output', 'Unsupported type for Sci-Fi.', { theme: 'Scifi' });
  }
}

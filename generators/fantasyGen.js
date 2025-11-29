// generators/fantasyGen.js
import { generateCharacter } from './characterGen.js';
import { generateWorld } from './worldGen.js';
import { generateWeapon } from './weaponGen.js';
import { generateQuest } from './questGen.js';
import { generateStory } from './storyGen.js';
import { formatOutput } from './commonUtils.js';

export async function generateFantasy(type, params = {}, userContext = {}) {
  switch (type) {
    case 'character':
      return await generateCharacter({ ...params, theme: 'Fantasy' }, userContext);
    case 'world':
      return await generateWorld({ ...params, theme: 'Fantasy' }, userContext);
    case 'weapon':
      return await generateWeapon({ ...params, theme: 'Fantasy' }, userContext);
    case 'quest':
      return await generateQuest({ ...params, theme: 'Fantasy' }, userContext);
    case 'story':
      return await generateStory({ ...params, theme: 'Fantasy' }, userContext);
    default:
      return formatOutput(type, 'Unknown Fantasy Output', 'Unsupported type for Fantasy.', { theme: 'Fantasy' });
  }
}

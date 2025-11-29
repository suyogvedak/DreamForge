// scripts/characterScript.js
import { generateText } from './aihelper.js';
import { displayCharacter, showToast } from './outputUtils.js';

document.addEventListener('DOMContentLoaded', () => {
  const generateBtn = document.getElementById('generateCharacterBtn');
  if (!generateBtn) return;
  const themeSelect = document.getElementById('themeSelect');
  const seedInput = document.getElementById('characterSeed');
  const useAIToggle = document.getElementById('useAI');
  const saveBtn = document.getElementById('saveCharacterBtn');

  let lastResult = null;
  generateBtn.addEventListener('click', async () => {
    generateBtn.disabled = true;
    try {
      const theme = themeSelect?.value || 'fantasy';
      const useAI = useAIToggle?.checked ?? true;
      const seed = seedInput?.value || null;
      const result = await generateText({ theme, seed, useAI });
      lastResult = result;
      displayCharacter(result);
    } catch (e) {
      console.error(e);
      showToast('Generate failed: ' + e.message, { type: 'error' });
    } finally {
      generateBtn.disabled = false;
    }
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!lastResult) return showToast('Nothing to save');
      saveBtn.disabled = true;
      try {
        let token = null;
        try {
          const auh = await import('./auh.js');
          token = await (auh.getIdToken ? auh.getIdToken() : null);
        } catch (e) { }

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const r = await fetch('/api/save', { method: 'POST', headers, body: JSON.stringify({ theme: themeSelect?.value || 'fantasy', type: 'character', payload: lastResult }) });
        if (!r.ok) {
          throw new Error(await r.text());
        }
        showToast('Saved to dashboard');
      } catch (e) {
        console.error(e);
        showToast('Save failed: ' + e.message, { type: 'error' });
      } finally { saveBtn.disabled = false; }
    });
  }
});

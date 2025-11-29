// scripts/questScript.js
import { showToast } from './outputUtils.js';

document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveQuestBtn');
  const outputBox = document.getElementById('questOutput');

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const payload = outputBox?.textContent || '';
      if (!payload) return showToast('Nothing to save');
      try {
        const auh = await import('./auh.js');
        const token = await (auh.getIdToken ? auh.getIdToken() : null);
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const r = await fetch('/api/save', { method: 'POST', headers, body: JSON.stringify({ theme: 'quests', type: 'quest', payload }) });
        if (!r.ok) throw new Error(await r.text());
        showToast('Quest saved');
      } catch (e) {
        console.error(e);
        showToast('Save failed: ' + e.message, { type: 'error' });
      }
    });
  }
});

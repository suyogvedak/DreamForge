// scripts/integrateButtons_scifi.js
// Sci-Fi integration: wires generator buttons, 3D buttons, and save behavior.
// Mirrors the cyberpunk/fantasy integration scripts.

const THEME = 'scifi';

function dfToast(msg, opts = {}) {
  const containerId = 'df-integration-toast';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.position = 'fixed';
    container.style.right = '20px';
    container.style.bottom = '20px';
    container.style.zIndex = 9999;
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.marginTop = '6px';
  el.style.padding = '8px 12px';
  el.style.borderRadius = '6px';
  el.style.background = opts.error ? '#7b1e1e' : '#0f172a';
  el.style.color = '#fff';
  container.appendChild(el);
  setTimeout(() => el.remove(), opts.timeout || 2400);
}

async function callGenerateServer({ theme = THEME, type, useAI = true, params = {} }) {
  const payload = { theme, type, useAI, params };
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(txt || `Server error ${res.status}`);
  }
  const body = await res.json();
  return body.result ?? body;
}

const outputBox = document.getElementById('outputBox');
const saveBtn = document.getElementById('saveBtn');
const actionButtons = document.querySelectorAll('.scifi-action'); // your page should mark action buttons with .scifi-action

let lastGen = { type: null, result: null, params: null };

function renderOutput(type, result) {
  if (!outputBox) return;
  try {
    outputBox.textContent = typeof result === 'string' ? result : (result.text ?? JSON.stringify(result, null, 2));
  } catch (e) {
    outputBox.textContent = String(result);
  }
}

function inject3D() {
  const charBtn = Array.from(actionButtons).find(b => b.dataset.type === 'character');
  const weapBtn = Array.from(actionButtons).find(b => b.dataset.type === 'weapon');

  const create3D = (id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.id = id;
    b.textContent = '3D';
    b.style.marginLeft = '8px';
    b.style.padding = '0.5rem 0.8rem';
    b.style.borderRadius = '0.45rem';
    b.style.border = 'none';
    b.classList.add('requires-auth');
    return b;
  };

  if (charBtn && !document.getElementById('gen3d-character-scifi')) {
    const b = create3D('gen3d-character-scifi');
    b.addEventListener('click', () => dfToast('3D Character generation not yet wired for Sci-Fi.'));
    charBtn.parentElement?.appendChild(b);
  }

  if (weapBtn && !document.getElementById('gen3d-weapon-scifi')) {
    const b = create3D('gen3d-weapon-scifi');
    b.addEventListener('click', () => dfToast('3D Weapon generation not yet wired for Sci-Fi.'));
    weapBtn.parentElement?.appendChild(b);
  }
}

async function handleGenerate(type) {
  let useAI = true;
  let params = {};
  try {
    const resp = await callGenerateServer({ theme: THEME, type, useAI, params });
    lastGen.type = type;
    lastGen.result = resp;
    lastGen.params = params;
    renderOutput(type, resp);
    dfToast('Generated', { timeout: 900 });
    if (saveBtn) saveBtn._payload = resp;
  } catch (err) {
    dfToast('Generation failed: ' + (err.message || err), { error: true });
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  inject3D();
  actionButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const t = btn.dataset.type;
      handleGenerate(t);
    });
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      // prefer stored payload, otherwise use outputBox text
      const payload = saveBtn._payload || (outputBox ? outputBox.textContent : null);
      if (!payload) return dfToast('Nothing to save');
      try {
        let token = null;
        try {
          const auh = await import('./auh.js');
          token = await (auh.getIdToken ? auh.getIdToken() : null);
        } catch (e) {}
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch('/api/save', {
          method: 'POST',
          headers,
          body: JSON.stringify({ theme: THEME, type: lastGen.type || 'item', payload })
        });
        if (res.ok) dfToast('Saved to dashboard');
        else {
          dfToast('Save failed', { error: true });
          console.error('Save failed', await res.text());
        }
      } catch (err) {
        dfToast('Save error: ' + (err.message || err), { error: true });
      }
    });
  }
});

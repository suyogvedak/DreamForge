// scripts/main.js
// Optional site initializer — wires auth UI (if auh.js exists), scroll progress, and other site-wide features.

(async function () {
  // Start centralized auth UI if available
  try {
    const auh = await import('./auh.js');
    if (auh && typeof auh.startAuthUI === 'function') {
      auh.startAuthUI();
    }
  } catch (e) {
    // auh.js missing — not fatal
    console.warn('auh.js not found or failed to load:', e && e.message);
  }

  // Scroll progress bar wiring (index.html uses #scroll-progress)
  try {
    const sp = document.getElementById('scroll-progress');
    if (sp) {
      window.addEventListener('scroll', () => {
        const scroll = window.scrollY;
        const height = document.documentElement.scrollHeight - window.innerHeight;
        const progress = height > 0 ? (scroll / height) * 100 : 0;
        sp.style.width = `${progress}%`;
      }, { passive: true });
    }
  } catch (e) {
    console.warn('Scroll progress init failed', e && e.message);
  }

  // Fade in body if CSS expects it
  window.addEventListener('load', () => {
    try {
      document.body.style.opacity = '1';
    } catch (e) {}
  });

  // Wire optional global save handlers (if you expose global save buttons)
  try {
    const globalSaveBtns = document.querySelectorAll('[data-global-save]');
    globalSaveBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const payload = btn.dataset.payload || null;
          if (!payload) return alert('No payload configured for global save.');
          const auh = await import('./auh.js');
          const token = await (auh.getIdToken ? auh.getIdToken() : null);
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = 'Bearer ' + token;
          const res = await fetch('/api/save', {
            method: 'POST',
            headers,
            body: JSON.stringify({ theme: btn.dataset.theme || 'generic', type: btn.dataset.type || 'item', payload: JSON.parse(payload) })
          });
          if (!res.ok) throw new Error(await res.text());
          alert('Saved');
        } catch (err) {
          console.error('Global save failed', err);
          alert('Save failed: ' + (err.message || err));
        }
      });
    });
  } catch (e) { /* ignore */ }
})();

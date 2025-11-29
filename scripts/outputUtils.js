// scripts/outputUtils.js
// UI helpers used by theme pages and generator UIs
// - showToast(message, {timeout, type})
// - displayResult(result, { containerId, pretty, append })
// - clearOutput(containerId)
// - renderSavedList(items, containerId)

/**
 * showToast: small ephemeral notification
 */
export function showToast(message, { timeout = 2200, type = 'info' } = {}) {
  const id = 'df-toast-container';
  let container = document.getElementById(id);
  if (!container) {
    container = document.createElement('div');
    container.id = id;
    container.style.position = 'fixed';
    container.style.right = '20px';
    container.style.bottom = '20px';
    container.style.zIndex = 99999;
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.textContent = message;
  el.style.marginTop = '8px';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '8px';
  el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.4)';
  el.style.background = type === 'error' ? '#7b1e1e' : '#0f172a';
  el.style.color = '#fff';
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
    if (!container.children.length) container.remove();
  }, timeout);
  return el;
}

/**
 * formatAsPre: utility to create a pre block or text node
 */
function formatAsPre(text, { pretty = true } = {}) {
  const pre = document.createElement('pre');
  pre.style.whiteSpace = 'pre-wrap';
  pre.style.wordBreak = 'break-word';
  pre.style.background = 'rgba(15, 23, 42, 0.8)'; // subtle background (won't affect your CSS)
  pre.style.padding = '12px';
  pre.style.borderRadius = '8px';
  pre.style.color = '#e6eef8';
  pre.textContent = pretty ? (typeof text === 'string' ? text : JSON.stringify(text, null, 2)) : String(text);
  return pre;
}

/**
 * displayResult
 * - result: normalized object { type, title, text, meta, source }
 * - opts:
 *    containerId: id of element to render into (defaults: outputBox)
 *    pretty: boolean -> pretty print JSON if needed
 *    append: boolean -> append vs replace
 */
export function displayResult(result, { containerId = 'outputBox', pretty = true, append = false } = {}) {
  if (!result) {
    showToast('No result to display', { type: 'error' });
    return;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`displayResult: container not found (#${containerId})`);
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'df-result';
  wrapper.style.marginBottom = '12px';

  // Title
  if (result.title) {
    const h = document.createElement('div');
    h.textContent = result.title;
    h.style.fontWeight = '700';
    h.style.marginBottom = '8px';
    h.style.color = '#c7f9ff';
    wrapper.appendChild(h);
  }

  // Meta small line
  if (result.meta && Object.keys(result.meta).length) {
    const metaLine = document.createElement('div');
    metaLine.textContent = Object.entries(result.meta).slice(0, 5).map(([k,v]) => `${k}:${typeof v==='string'?v:(typeof v==='object'?'[obj]':String(v))}`).join(' • ');
    metaLine.style.fontSize = '12px';
    metaLine.style.color = '#9ca3af';
    metaLine.style.marginBottom = '8px';
    wrapper.appendChild(metaLine);
  }

  // Text body
  if (result.text) {
    const pre = formatAsPre(result.text, { pretty });
    wrapper.appendChild(pre);
  } else {
    // If no textual body, show full JSON
    const pre = formatAsPre(result, { pretty: true });
    wrapper.appendChild(pre);
  }

  if (!append) container.innerHTML = '';
  container.appendChild(wrapper);
  return wrapper;
}

/**
 * clearOutput
 */
export function clearOutput(containerId = 'outputBox') {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}

/**
 * renderSavedList
 * - items: array of saved docs (from /api/dashboard or /api/save GET)
 * - containerId: where to render
 */
export function renderSavedList(items = [], containerId = 'savedItems') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`renderSavedList: container not found (#${containerId})`);
    return;
  }
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = '<p class="text-gray-400">No saved items yet.</p>';
    return;
  }

  items.forEach(it => {
    const card = document.createElement('div');
    card.className = 'df-saved-card';
    card.style.padding = '12px';
    card.style.borderRadius = '8px';
    card.style.background = 'rgba(17, 24, 39, 0.7)';
    card.style.marginBottom = '8px';

    const title = document.createElement('div');
    title.textContent = it.title || (it.payload && it.payload.title) || `${it.type || 'item'}`;
    title.style.fontWeight = '700';
    title.style.color = '#c7f9ff';
    card.appendChild(title);

    const meta = document.createElement('div');
    meta.style.fontSize = '12px';
    meta.style.color = '#9ca3af';
    meta.textContent = `Theme: ${it.theme || (it.payload && it.payload.theme) || '—'} • Saved: ${new Date(it.createdAt || it.created_at || Date.now()).toLocaleString()}`;
    card.appendChild(meta);

    const body = document.createElement('div');
    body.style.marginTop = '8px';
    const text = (it.payload && (it.payload.text || it.payload.output)) || it.text || it.output || JSON.stringify(it, null, 2);
    const pre = formatAsPre(text, { pretty: true });
    card.appendChild(pre);

    container.appendChild(card);
  });
}

export { showToast as toast };

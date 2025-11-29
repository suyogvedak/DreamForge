// scripts/export.js
export async function saveItem(theme, type, payload) {
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
    body: JSON.stringify({ theme, type, payload })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// /scripts/dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const authButtons = document.getElementById("auth-buttons");
const dashboardContent = document.getElementById("dashboardContent");
const noContentMsg = document.getElementById("noContentMsg");

function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return String(ts || ""); }
}

function renderItem(item) {
  const card = document.createElement("div");
  card.className = "glass p-4 hover:shadow-lg transition";

  const title = document.createElement("h3");
  title.className = "text-xl font-bold text-cyan-300 mb-2";
  title.textContent = item.title || `${item.type || "item"} (${item.theme || "generic"})`;

  const meta = document.createElement("p");
  meta.className = "text-sm text-gray-400 mb-2";
  const createdAt = item.createdAt ? formatDate(item.createdAt) : "";
  meta.textContent = `${item.theme || "generic"} • ${item.type || "unknown"}${createdAt ? " • " + createdAt : ""}`;

  const text = document.createElement("pre");
  text.className = "text-gray-200 whitespace-pre-wrap text-sm";
  let bodyText = "";
  if (item.text && String(item.text).trim()) bodyText = item.text;
  else if (item.raw) {
    try { bodyText = typeof item.raw === "string" ? item.raw : JSON.stringify(item.raw, null, 2); }
    catch { bodyText = String(item.raw); }
  } else if (item.meta && typeof item.meta === "object") {
    try { bodyText = JSON.stringify(item.meta, null, 2); } catch { bodyText = ""; }
  }
  text.textContent = bodyText;

  card.appendChild(title);
  card.appendChild(meta);

  if (item.image) {
    const img = document.createElement("img");
    img.src = item.image;
    img.alt = "Generated image";
    img.className = "w-full h-auto rounded mb-3";
    card.appendChild(img);
  }

  card.appendChild(text);
  return card;
}

async function loadDashboard(uid) {
  if (!uid) {
    dashboardContent.innerHTML = `<p class="text-center text-gray-400">Please log in to view your saved content.</p>`;
    noContentMsg.classList.add("hidden");
    return;
  }

  dashboardContent.innerHTML = `<p class="text-center text-gray-400">Loading...</p>`;
  noContentMsg.classList.add("hidden");

  try {
    const email = auth.currentUser?.email || "";
    const params = new URLSearchParams();
    if (email) params.append("userEmail", email);
    const url = `/api/dashboard/${encodeURIComponent(uid)}?${params.toString()}`;
    console.debug("[dashboard] GET", url);

    const res = await fetch(url);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error("Invalid JSON response from server: " + text); }

    if (!res.ok) throw new Error(json?.error || JSON.stringify(json) || `HTTP ${res.status}`);
    if (!json.ok) throw new Error(json.error || "Server returned ok:false");

    const items = Array.isArray(json.items) ? json.items : [];
    dashboardContent.innerHTML = "";
    if (items.length === 0) {
      noContentMsg.classList.remove("hidden");
      return;
    }
    noContentMsg.classList.add("hidden");
    items.forEach(it => dashboardContent.appendChild(renderItem(it)));
  } catch (err) {
    console.error("Dashboard fetch failed:", err);
    dashboardContent.innerHTML = `<p class="text-red-400">Error loading dashboard: ${escapeHtml(err.message || String(err))}</p>`;
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    authButtons.innerHTML = `
      <span class='text-sm text-gray-300'>${escapeHtml(user.email || "")}</span>
      <button id="logoutBtn" class="bg-cyan-600 px-3 py-1 rounded hover:bg-cyan-700">Logout</button>
    `;
    document.getElementById("logoutBtn")?.addEventListener("click", () => signOut(auth).then(() => location.href='index.html').catch(console.error));
    loadDashboard(user.uid);
  } else {
    authButtons.innerHTML = `
      <a href="login.html" class="bg-cyan-600 px-3 py-1 rounded hover:bg-cyan-700">Login</a>
      <a href="register.html" class="border border-cyan-400 px-3 py-1 rounded hover:bg-cyan-600 text-cyan-300">Sign Up</a>
    `;
    dashboardContent.innerHTML = `<p class="text-center text-gray-400">Please log in to view your saved content.</p>`;
    noContentMsg.classList.add("hidden");
  }
});

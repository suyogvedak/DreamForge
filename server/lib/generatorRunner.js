// scripts/generatorRunner.js
(function () {
  const allowedTypes = ["character", "weapon", "world", "quest", "story", "logo", "name"];
  const outputContainer =
    document.getElementById("output") ||
    document.getElementById("output-box") ||
    document.querySelector(".generated-output") ||
    document.querySelector(".output") ||
    document.querySelector(".generated");

  function detectTheme() {
    const p = window.location.pathname.toLowerCase();
    if (p.includes("cyberpunk")) return "cyberpunk";
    if (p.includes("scifi")) return "scifi";
    return "fantasy";
  }

  function normalizeType(raw) {
    if (!raw) return null;
    const s = String(raw).trim().toLowerCase();
    for (const t of allowedTypes) {
      if (s === t) return t;
      if (s.includes(t)) return t;
      if (s.replace(/[^a-z]/g, "").includes(t)) return t;
    }
    return null;
  }

  function findButtonFromEventTarget(el) {
    if (!el) return null;
    return el.closest("button, a, div");
  }

  function extractImageFromResponse(json) {
    // Try several locations to be robust:
    // - json.data.image
    // - json.image
    // - json.data.raw.image
    // - json.data.raw.imageData
    // - json.data.raw.dataUri
    // - json.data.svg
    if (!json) return null;
    if (json.data && json.data.image) return json.data.image;
    if (json.image) return json.image;
    if (json.data && json.data.raw) {
      const raw = json.data.raw;
      if (raw.image) return raw.image;
      if (raw.imageData) return raw.imageData;
      if (raw.dataUri) return raw.dataUri;
      if (raw.svg) return raw.svg;
    }
    // final fallback: maybe the generator returned image under dataUri top-level
    if (json.dataUri) return json.dataUri;
    return null;
  }

  function extractTitleText(json, type) {
    const raw = json?.data || json;
    const title = raw?.title || raw?.name || json?.title || (type ? type.toUpperCase() : "Result");
    const text = raw?.text || json?.text || json?.data?.text || JSON.stringify(raw, null, 2);
    return { title, text };
  }

  async function postGenerate(type, theme, opts = {}) {
    console.log("[generatorRunner] -> sending POST /api/generate", { type, theme, opts });
    if (outputContainer) outputContainer.innerHTML = `<div class="loading">Generating ${type}...</div>`;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type, theme, useAI: !!opts.useAI, params: opts.params || {} }),
      });

      const textResp = await res.text();
      let json;
      try {
        json = textResp ? JSON.parse(textResp) : null;
      } catch (e) {
        // show non-json responses in UI for debug
        console.error("[generatorRunner] Non-JSON response:", textResp);
        if (outputContainer) outputContainer.innerText = `Server returned non-JSON response:\n\n${textResp}`;
        return;
      }

      console.log("[generatorRunner] raw response:", json);

      if (!json || json.ok === false) {
        const err = json?.error || json?.message || "Generation failed";
        throw new Error(err);
      }

      const img = extractImageFromResponse(json);
      const { title, text } = extractTitleText(json, type);

      // Build HTML
      let html = `<div class="generated-block" style="padding:16px;">
                    <h3 style="margin:0 0 10px 0">${escapeHtml(title)}</h3>
                    <pre style="white-space:pre-wrap; margin:0 0 12px 0">${escapeHtml(text)}</pre>
                  </div>`;

      if (img) {
        html += `<div style="margin-top:12px;">
                  <div style="max-width:760px; border-radius:6px; overflow:hidden; box-shadow:0 6px 20px rgba(0,0,0,0.45);">
                    <img id="df_generated_img" src="${img}" alt="${escapeAttr(title)}" style="display:block; width:100%; height:auto;"/>
                  </div>
                  <div style="margin-top:8px;">
                    <button id="downloadImageBtn" class="df-btn">Download Image</button>
                  </div>
                 </div>`;
      }

      if (outputContainer) outputContainer.innerHTML = html;
      else console.log("[generatorRunner] generated:", title, text);

      if (img) {
        const dl = document.getElementById("downloadImageBtn");
        if (dl) dl.addEventListener("click", () => downloadDataUri(img, `${theme}_${type}_image`));
      }
    } catch (err) {
      console.error("[generatorRunner] error:", err);
      if (outputContainer) outputContainer.innerText = `Error: ${err.message}`;
    }
  }

  // Helpers
  function escapeHtml(s) {
    if (typeof s !== "string") return String(s);
    return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/\n/g, " ");
  }

  function downloadDataUri(uri, filenameNoExt = "download") {
    try {
      let ext = "png";
      const m = uri.match(/^data:(image\/[a-z0-9.+-]+);base64,/i);
      if (m) {
        const mime = m[1];
        if (mime.includes("svg")) ext = "svg";
        else if (mime.includes("png")) ext = "png";
        else if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
        else if (mime.includes("gif")) ext = "gif";
      } else {
        const parsed = uri.split("?")[0];
        const seg = parsed.split(".").pop();
        if (seg && seg.length <= 5) ext = seg;
      }
      const a = document.createElement("a");
      a.href = uri;
      a.download = `${filenameNoExt}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error("Download fail", e);
      window.open(uri, "_blank");
    }
  }

  // Click handling
  document.addEventListener("click", (ev) => {
    const btn = findButtonFromEventTarget(ev.target);
    if (!btn) return;
    const candidateSources = [
      btn.dataset && btn.dataset.generator,
      btn.getAttribute && btn.getAttribute("data-generator"),
      btn.id,
      btn.name,
      btn.getAttribute && btn.getAttribute("aria-label"),
      btn.textContent,
      btn.innerText
    ];
    let detected = null;
    for (const s of candidateSources) {
      const t = normalizeType(s);
      if (t) {
        detected = t;
        break;
      }
    }
    if (!detected) return;
    const theme = detectTheme();
    console.log("[generatorRunner] clicked generator", { detected, theme, element: btn });
    postGenerate(detected, theme, { useAI: false });
  });

  // Expose manual API
  window.__dreamforge_generate = postGenerate;
})();

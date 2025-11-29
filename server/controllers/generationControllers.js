// server/controllers/generationControllers.js - corrected import for Content model

import Content from '../models/Content.js';
import { runGenerator } from '../lib/generatorRunner.js';
import { uploadAssetsToGridFS } from '../lib/storage_gridfs.js';

export async function generateHandler(req, res) {
  try {
    const { theme, kind, params = {}, seed } = req.body;
    const user = req.user || null;
    const result = await runGenerator({ theme, kind, params, seed, user });
    return res.json({ ok: true, result });
  } catch (err) {
    console.error('[generateHandler]', err);
    return res.status(500).json({ ok: false, error: 'Generation failed' });
  }
}

export async function saveHandler(req, res) {
  try {
    const { data, assets = [], theme, kind } = req.body;
    const user = req.user || null;
    const uploaded = await uploadAssetsToGridFS(assets || []);
    const newDoc = new Content({
      userId: user?.uid || null,
      theme, kind,
      data,
      assets: uploaded,
      source: 'manual',
      versionOf: null,
      versionNumber: 1,
      metadata: {}
    });
    await newDoc.save();
    return res.json({ ok: true, doc: newDoc });
  } catch (err) {
    console.error('[saveHandler]', err);
    return res.status(500).json({ ok: false, error: 'Save failed' });
  }
}

export async function regenerateHandler(req, res) {
  try {
    const { previousId, params = {}, seed } = req.body;
    let theme, kind, prevDoc;
    if (previousId) {
      prevDoc = await Content.findById(previousId);
      if (!prevDoc) return res.status(404).json({ ok: false, error: 'Previous not found' });
      theme = prevDoc.theme; kind = prevDoc.kind;
    } else {
      theme = params.theme; kind = params.kind;
    }
    const user = req.user || null;
    const generated = await runGenerator({ theme, kind, params, seed, user });
    const uploaded = await uploadAssetsToGridFS(generated.assets || []);
    const newDoc = new Content({
      userId: user?.uid || null,
      theme, kind,
      data: generated.data,
      assets: uploaded,
      source: generated.source || 'ai',
      versionOf: previousId || null,
      versionNumber: prevDoc ? (prevDoc.versionNumber || 1) + 1 : 1,
      metadata: generated.metadata || {}
    });
    await newDoc.save();
    return res.json({ ok: true, doc: newDoc });
  } catch (err) {
    console.error('[regenerateHandler]', err);
    return res.status(500).json({ ok: false, error: 'Regenerate failed' });
  }
}

// server/api/openaiClient.js
import dotenv from "dotenv";
import OpenAI from "openai";
import fetch from "node-fetch";

dotenv.config({ path: "./scripts/.env" });

const openaiApiKey = process.env.OPENAI_API_KEY || null;
const geminiApiKey = process.env.GEMINI_API_KEY || null;

// ---------- OpenAI Client ----------
let openai = null;
if (openaiApiKey) {
  openai = new OpenAI({ apiKey: openaiApiKey });
  console.log("[openaiClient] OpenAI client initialized ✅");
} else {
  console.warn("[openaiClient] No OpenAI API key found, will try Gemini fallback");
}

// ---------- Gemini Client ----------
async function geminiRequest(model, contents) {
  if (!geminiApiKey) throw new Error("No GEMINI_API_KEY provided");
  const url = `https://generativelanguage.googleapis.com/v1/${model}:generateContent?key=${geminiApiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: contents }] }] }),
  });

  if (!resp.ok) {
    throw new Error(`Gemini request failed: ${resp.status} ${await resp.text()}`);
  }

  const data = await resp.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ---------- Helpers ----------
async function safeTextGen(prompt, openaiModel = "gpt-4o-mini", geminiModel = "models/gemini-2.5-flash") {
  // Try OpenAI first
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: openaiModel,
        messages: [{ role: "user", content: prompt }],
      });
      return completion.choices[0].message.content;
    } catch (err) {
      console.error("[openaiClient] OpenAI text gen failed:", err.message);
    }
  }
  // Gemini fallback
  try {
    return await geminiRequest(geminiModel, prompt);
  } catch (err) {
    console.error("[openaiClient] Gemini text gen failed:", err.message);
    return null;
  }
}

async function safeImageGen(prompt, size = "1024x1024") {
  // Try OpenAI first
  if (openai) {
    try {
      const img = await openai.images.generate({ model: "gpt-image-1", prompt, size });
      return img.data[0].b64_json
        ? `data:image/png;base64,${img.data[0].b64_json}`
        : img.data[0].url;
    } catch (err) {
      console.error("[openaiClient] OpenAI image gen failed:", err.message);
    }
  }
  // Gemini fallback (textual description only for now)
  try {
    const desc = await geminiRequest("models/gemini-2.0-flash-preview-image-generation", prompt);
    return `data:text/plain;base64,${Buffer.from(desc).toString("base64")}`;
  } catch (err) {
    console.error("[openaiClient] Gemini image gen failed:", err.message);
    return null;
  }
}

// ---------- Exports for generators ----------
export async function generateAICharacter(theme) {
  return await safeTextGen(`Generate a unique ${theme} character with backstory, traits, and skills.`);
}

export async function generateAIWeapon(theme) {
  return await safeTextGen(`Generate a detailed ${theme} weapon with stats, lore, and design notes.`);
}

export async function generateAIWorld(theme) {
  return await safeTextGen(`Generate a unique ${theme} world with terrain, climate, culture, conflicts, and landmarks.`);
}

export async function generateAIQuest(theme) {
  return await safeTextGen(`Generate a challenging ${theme} quest with urgency, difficulty, and moral choices.`);
}

export async function generateAIStory(theme) {
  return await safeTextGen(`Write a short immersive ${theme} story with characters, conflict, and resolution.`);
}

export async function generateAILogo(theme) {
  const prompt = `Design a creative ${theme} logo that captures the essence of the theme.`;
  return await safeImageGen(prompt, "1024x1024");
}

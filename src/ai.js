import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getHistory, saveMessage } from "./db.js";

const DEFAULT_AIMLAPI_URL = "https://api.aimlapi.com/v1/chat/completions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROMPT_FILE = join(__dirname, "../prompts/system.txt");

function loadSystemPrompt() {
  if (process.env.AI_SYSTEM_PROMPT) {
    return process.env.AI_SYSTEM_PROMPT;
  }

  const promptFile = process.env.AI_SYSTEM_PROMPT_FILE || DEFAULT_PROMPT_FILE;
  return readFileSync(promptFile, "utf8").trim();
}

export async function askAi(userMessage, userId) {
  const apiKey = process.env.AIMLAPI_KEY || process.env.AI_SERVICE_KEY;
  const apiUrl = process.env.AIMLAPI_URL || DEFAULT_AIMLAPI_URL;
  const model = process.env.AI_MODEL || "openai/gpt-4.1-2025-04-14";
  const systemPrompt = loadSystemPrompt();
  const history = await getHistory(userId);

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage },
  ];

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AIML API ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AIML API returned empty response");
  }

  await saveMessage(userId, "user", userMessage);
  await saveMessage(userId, "assistant", content);

  return content;
}

const TELEGRAM_MAX_LENGTH = 4096;

export function splitMessage(text) {
  if (text.length <= TELEGRAM_MAX_LENGTH) {
    return [text];
  }

  const chunks = [];

  for (let i = 0; i < text.length; i += TELEGRAM_MAX_LENGTH) {
    chunks.push(text.slice(i, i + TELEGRAM_MAX_LENGTH));
  }

  return chunks;
}

const DEFAULT_AIMLAPI_URL = "https://api.aimlapi.com/v1/chat/completions";

const DEFAULT_SYSTEM_PROMPT = `Тебя зовут Саня. Ты общаешься с людьми в Telegram от своего имени.

О себе:
- Ты fullstack-разработчик.
- Пишешь в основном на TypeScript и работаешь с разными фреймворками.
- Веришь в людей.
- Любишь петь.

Правила:
- Никогда не говори, что ты AI, языковая модель, ChatGPT, бот или программа.
- Никогда не называй название модели, провайдера или технические детали своей работы как ассистента.
- Если спрашивают, кто ты или какая ты модель — рассказывай о себе как о Сане: разработчик, TS, фреймворки, любишь петь, веришь в людей.
- Отвечай естественно, по-человечески, на русском языке.`;

export async function askAi(userMessage) {
  const apiKey = process.env.AIMLAPI_KEY || process.env.AI_SERVICE_KEY;
  const apiUrl = process.env.AIMLAPI_URL || DEFAULT_AIMLAPI_URL;
  const model = process.env.AI_MODEL || "openai/gpt-4.1-2025-04-14";
  const systemPrompt = process.env.AI_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT;

  const messages = [
    { role: "system", content: systemPrompt },
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

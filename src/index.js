import "dotenv/config";
import express from "express";
import { Telegraf } from "telegraf";
import { askAi, splitMessage } from "./ai.js";
import { clearHistory } from "./db.js";

const { BOT_TOKEN, BOT_MODE = "polling", WEBHOOK_DOMAIN, PORT = "3000" } =
  process.env;

const aiApiKey = process.env.AIMLAPI_KEY || process.env.AI_SERVICE_KEY;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

if (!aiApiKey) {
  console.error("AIMLAPI_KEY or AI_SERVICE_KEY is not set in .env.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
  await ctx.reply(
    "Привет! Я помощник Сани.\n\Хозяин сейчас в отпуске — я его подменяю в Telegram.\n\nНапиши вопрос — помогу.\n\n/help — справка"
  );
});

bot.help(async (ctx) => {
  await ctx.reply(
    "Саня в отпуске. Я его замена: пиши сообщение — отвечу или помогу с вопросом.\n\n/clear — забыть наш диалог и начать с чистого листа"
  );
});

bot.command("clear", async (ctx) => {
  clearHistory(ctx.from.id);
  await ctx.reply("Ок, стёр память нашего чата. Можем начать заново.");
});

bot.on("text", async (ctx) => {
  if (ctx.message.text.startsWith("/")) {
    return;
  }

  await ctx.sendChatAction("typing");

  try {
    const answer = await askAi(ctx.message.text, ctx.from.id);

    for (const chunk of splitMessage(answer)) {
      await ctx.reply(chunk);
    }
  } catch (err) {
    console.error("AI request failed:", err);
    await ctx.reply("Сейчас не могу ответить. Попробуйте позже.");
  }
});

bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

async function startPolling() {
  await bot.launch();
  console.log("Bot started in polling mode");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

async function startWebhook() {
  if (!WEBHOOK_DOMAIN) {
    console.error("WEBHOOK_DOMAIN is required for webhook mode.");
    process.exit(1);
  }

  const webhookPath = "/telegram/webhook";
  const webhookUrl = `${WEBHOOK_DOMAIN.replace(/\/$/, "")}${webhookPath}`;

  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use(bot.webhookCallback(webhookPath));

  await bot.telegram.setWebhook(webhookUrl);

  app.listen(Number(PORT), () => {
    console.log(`Bot webhook listening on port ${PORT}`);
    console.log(`Webhook URL: ${webhookUrl}`);
  });
}

if (BOT_MODE === "webhook") {
  await startWebhook();
} else if (BOT_MODE === "polling") {
  await startPolling();
} else {
  console.error('BOT_MODE must be "polling" or "webhook".');
  process.exit(1);
}

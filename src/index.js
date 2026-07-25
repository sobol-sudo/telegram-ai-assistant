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
    "Hi! I'm Sanya's assistant.\n\nHe's away on vacation right now — I'm covering for him on Telegram.\n\nJust ask me anything — I'll help.\n\n/help — commands"
  );
});

bot.help(async (ctx) => {
  await ctx.reply(
    "Sanya is on vacation. I'm standing in for him: send me a message and I'll answer or help you out.\n\n/clear — forget our conversation and start from a clean slate"
  );
});

bot.command("clear", async (ctx) => {
  await clearHistory(ctx.from.id);
  await ctx.reply("Done, I've wiped our chat history. We can start over.");
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
    await ctx.reply("I can't answer right now. Please try again later.");
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

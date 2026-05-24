# Sanya Telegram Bot

Telegram AI assistant built with **Node.js**, **Telegraf**, **AIML API**, and **PostgreSQL** — featuring per-user conversation memory, editable persona prompts, bilingual replies, and Railway-ready deployment.

## Features

- **Telegram bot** powered by [Telegraf](https://telegraf.js.org/)
- **AI responses** via [AIML API](https://aimlapi.com/) (OpenAI-compatible chat completions)
- **Conversation memory** — PostgreSQL stores chat history per user
- **Custom persona** — edit `prompts/system.txt` without touching code
- **Bilingual** — replies in Russian or English based on the user's message
- **Two run modes** — long polling (default) or webhook
- **Railway-ready** — `railway.toml` + Nixpacks config included

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22 |
| Bot framework | Telegraf 4 |
| AI | AIML API |
| Database | PostgreSQL (`pg`) |
| HTTP (webhook) | Express 5 |
| Deploy | Railway |

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- An [AIML API](https://aimlapi.com/) key
- A PostgreSQL database (Railway Postgres works for both local dev and production)

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/sobol4156/chat-bot-sanya.git
cd chat-bot-sanya
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
BOT_TOKEN=your_telegram_bot_token
AIMLAPI_KEY=your_aimlapi_key
AIMLAPI_URL=https://api.aimlapi.com/v1/chat/completions
BOT_MODE=polling
DATABASE_URL=postgresql://postgres:password@host:5432/railway
```

> **Local tip:** use the **public** Database URL from Railway Postgres → **Connect** → **Public Network**.

### 3. Run

```bash
npm run dev   # with auto-reload
# or
npm start
```

Open your bot in Telegram and send `/start`.

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | Usage info |
| `/clear` | Reset conversation history for the current user |

## Customizing the AI Persona

Edit `prompts/system.txt` to change tone, rules, and backstory. Restart the bot after changes.

Optional overrides via environment variables:

| Variable | Description |
|----------|-------------|
| `AI_SYSTEM_PROMPT` | Inline system prompt (overrides the file) |
| `AI_SYSTEM_PROMPT_FILE` | Path to a custom prompt file |
| `AI_MODEL` | AIML model ID (default: `openai/gpt-4.1-2025-04-14`) |
| `CHAT_HISTORY_LIMIT` | Max messages stored per user (default: `20`) |

## Deploy on Railway

### 1. Push to GitHub

```bash
git push origin main
```

### 2. Create a Railway project

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select this repository

### 3. Add PostgreSQL

1. **+ New** → **Database** → **PostgreSQL**

### 4. Link the database to the bot service

1. Open the **bot service** (not Postgres) → **Variables**
2. **+ New Variable** → **Add Reference**
3. Select **PostgreSQL** → **`DATABASE_PRIVATE_URL`**

### 5. Set remaining variables

| Variable | Value |
|----------|-------|
| `BOT_TOKEN` | Telegram bot token |
| `AIMLAPI_KEY` | AIML API key |
| `AIMLAPI_URL` | `https://api.aimlapi.com/v1/chat/completions` |
| `BOT_MODE` | `polling` |

### 6. Deploy

Railway runs `npm start` automatically. Check logs for:

```
Database ready (PostgreSQL)
Bot started in polling mode
```

> **Important:** only one polling instance can run per bot token. Stop local `npm start` before deploying.

## Webhook Mode (optional)

```env
BOT_MODE=webhook
WEBHOOK_DOMAIN=https://your-app.up.railway.app
PORT=3000
```

The bot registers webhook at `/telegram/webhook` and exposes a `/health` endpoint.

## Project Structure

```
chat-bot/
├── prompts/
│   └── system.txt      # AI persona & rules
├── src/
│   ├── index.js        # Telegraf bot, commands, polling/webhook
│   ├── ai.js           # AIML API client
│   └── db.js           # PostgreSQL message history
├── .env.example
├── railway.toml
├── nixpacks.toml
└── package.json
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_TOKEN` | yes | Telegram bot token |
| `AIMLAPI_KEY` | yes | AIML API key |
| `DATABASE_URL` | yes* | PostgreSQL connection string (local) |
| `DATABASE_PRIVATE_URL` | yes* | PostgreSQL internal URL (Railway) |
| `AIMLAPI_URL` | no | AIML API endpoint |
| `BOT_MODE` | no | `polling` (default) or `webhook` |
| `WEBHOOK_DOMAIN` | webhook only | Public HTTPS URL |
| `PORT` | webhook only | HTTP port (default: `3000`) |
| `AI_MODEL` | no | Model identifier |
| `CHAT_HISTORY_LIMIT` | no | History size per user |

\* One of `DATABASE_URL`, `DATABASE_PRIVATE_URL`, or `PGHOST` + `PGUSER` + `PGPASSWORD` + `PGDATABASE` is required.

## Troubleshooting

### `409 Conflict: terminated by other getUpdates request`

Two bot instances share the same token. Stop local dev server and ensure Railway runs **one replica**.

### `DATABASE_URL is not set`

Add a PostgreSQL reference to the bot service variables on Railway, or set `DATABASE_URL` in `.env` for local development.

### Build fails on `better-sqlite3`

This project uses **PostgreSQL only**. Make sure you are on the latest commit — SQLite has been removed.

## License

MIT

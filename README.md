# TLDR Discord Bot

A Discord bot that posts TLDR newsletters to your server.

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

```env
# Required: Discord Webhook URL
# Create a webhook in your Discord server: Server Settings -> Integrations -> Webhooks -> New Webhook
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url

# Required: Vercel KV Store Configuration
# Create a KV store in your Vercel project: Storage -> KV -> Create
KV_STORE_URL=https://your-kv-store-url
KV_STORE_TOKEN=your-kv-store-token
```

## Environment Variables

### Required Variables

- `DISCORD_WEBHOOK_URL`: The webhook URL for your Discord server where the newsletters will be posted
- `KV_STORE_URL`: Your Vercel KV store URL for tracking posted categories
- `KV_STORE_TOKEN`: Your Vercel KV store authentication token

## Deployment

1. Deploy to Vercel:
   ```bash
   vercel
   ```

2. Set up environment variables in your Vercel project settings

3. Configure a cron job to run the function hourly:
   ```json
   {
     "crons": [{
       "path": "/api/tldr",
       "schedule": "0 * * * *"
     }]
   }
   ```

## Features

- Posts TLDR newsletters to Discord
- Tracks posted categories to avoid duplicates
- Handles redirects when news isn't released yet
- Posts each article as a separate message
- Includes read time and category information
- Cleans tracking parameters from URLs 
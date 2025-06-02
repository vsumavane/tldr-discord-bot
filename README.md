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

# Required: Upstash KV (Vercel KV) Store Configuration
# Get these values from your Vercel project settings after creating a KV store (Storage -> KV)
KV_REST_API_URL=https://your-kv-rest-api-url
KV_REST_API_TOKEN=your-kv-rest-api-token
```

## Environment Variables

### Required Variables

- `DISCORD_WEBHOOK_URL`: The webhook URL for your Discord server where the newsletters will be posted
- `KV_REST_API_URL`: Your Upstash KV (Vercel KV) store REST API URL for tracking posted categories
- `KV_REST_API_TOKEN`: Your Upstash KV (Vercel KV) store REST API authentication token

## Running the Project

### Local Development

To run the project locally for development and testing, ensure you have your `.env` file configured and run:

```bash
npm run dev
```

This will execute the serverless function using Node.js and load environment variables from your `.env` file.

### Production (Vercel)

For production, the project is deployed as a serverless function on Vercel. It is designed to be triggered by a Vercel Cron Job on an hourly schedule. Follow the deployment steps below to set this up.

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
- Tracks posted categories to avoid duplicates (using Upstash KV)
- Handles redirects when news isn't released yet
- Posts each article as a separate message
- Includes read time and category information
- Cleans tracking parameters from URLs 
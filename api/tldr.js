import axios from "axios";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
dotenv.config();

const WEBHOOKS = {
  tech: process.env.DISCORD_WEBHOOK_TECH_URL,
  webdev: process.env.DISCORD_WEBHOOK_WEBDEV_URL,
  ai: process.env.DISCORD_WEBHOOK_AI_URL,
  infosec: process.env.DISCORD_WEBHOOK_INFOSEC_URL,
  product: process.env.DISCORD_WEBHOOK_PRODUCT_URL,
  devops: process.env.DISCORD_WEBHOOK_DEVOPS_URL,
  founders: process.env.DISCORD_WEBHOOK_FOUNDERS_URL,
  design: process.env.DISCORD_WEBHOOK_DESIGN_URL
};

function getTodayDateIST() {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 5.5);
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return null; // Weekend
  return now.toISOString().slice(0, 10);
}

function makeEmbed(title, summary, url) {
  return {
    title,
    description: summary.length > 300 ? summary.slice(0, 297) + "..." : summary,
    url,
    color: 0x5865F2 // Discord blurple
  };
}

export default async function handler(req, res) {
  const dateStr = getTodayDateIST();
  if (!dateStr) return res.status(200).send("Weekend – no newsletters.");

  let posted = 0;

  for (const [category, webhook] of Object.entries(WEBHOOKS)) {
    const url = `https://tldr.tech/${category}/${dateStr}`;

    try {
      const { data: html } = await axios.get(url);
      const $ = cheerio.load(html);

      const articles = $("article");
      const embeds = [];

      articles.each((i, el) => {
        const title = $(el).find("h3").text().trim();
        const link = $(el).find("a").attr("href") || "";
        const summary = $(el).find(".newsletter-html").text().trim();

        if (!title || !summary || !link || link.includes("sponsor")) return;

        embeds.push(makeEmbed(title, summary, link));
      });

      if (!embeds.length) continue;

      // Post in batches of 10 embeds (Discord limit per message)
      const batched = embeds.slice(0, 10);
      await axios.post(webhook, {
        content: `📚 **TLDR: ${category.toUpperCase()} – ${dateStr}**`,
        embeds: batched
      });

      posted++;
    } catch (err) {
      console.error(`Failed for ${category}:`, err.message);
    }
  }

  res.status(200).send(`Posted ${posted} TLDR sections with embeds.`);
}

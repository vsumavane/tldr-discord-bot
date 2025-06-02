import axios from 'axios';
import dotenv from 'dotenv';
import { CATEGORY_CONFIG, DISCORD_COLORS } from '../config.js';
import { cleanUrl, extractReadTime, cleanTitle, formatSummary, getTodayDateSF, sleep } from '../utils.js';

dotenv.config();

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

function makeEmbed(title, summary, url, category) {
  const config = CATEGORY_CONFIG[category];
  const cleanLink = cleanUrl(url);
  const readTime = extractReadTime(title);
  const cleanTitleText = cleanTitle(title);
  const formattedSummary = formatSummary(summary);
  
  return {
    title: cleanTitleText,
    description: formattedSummary,
    url: cleanLink,
    color: DISCORD_COLORS.primary,
    author: {
      name: config.name,
      icon_url: "https://tldr.tech/logo-jpg.jpg"
    },
    fields: [
      {
        name: "📚 Category",
        value: config.name,
        inline: true
      },
      {
        name: "⏱️ Read Time",
        value: readTime ? `${readTime} minutes` : "N/A",
        inline: true
      }
    ],
    footer: {
      text: `${config.emoji} ${config.name} • ${getTodayDateSF()}`
    },
    timestamp: new Date().toISOString()
  };
}

export async function postCategoryHeader(category, dateStr) {
  const config = CATEGORY_CONFIG[category];
  await axios.post(WEBHOOK_URL, {
    content: `${config.emoji} **${config.name} - ${dateStr}**\n*Today's top stories and insights*`,
    username: config.name,
    avatar_url: "https://tldr.tech/logo-jpg.jpg"
  });
  await sleep(1000);
}

export async function postArticle(title, summary, url, category) {
  const config = CATEGORY_CONFIG[category];
  await axios.post(WEBHOOK_URL, {
    embeds: [makeEmbed(title, summary, url, category)],
    username: config.name,
    avatar_url: "https://tldr.tech/logo-jpg.jpg"
  });
  await sleep(1500);
} 
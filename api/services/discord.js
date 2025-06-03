import axios from 'axios';
import dotenv from 'dotenv';
import { CATEGORY_CONFIG, DISCORD_COLORS } from '../config.js';
import { cleanUrl, extractReadTime, cleanTitle, formatSummary, getTodayDateSF, sleep, fetchUrlMetadata } from '../utils.js';

dotenv.config();

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function makeEmbed(title, summary, url, category) {
  const config = CATEGORY_CONFIG[category];
  const cleanLink = cleanUrl(url);
  const readTime = extractReadTime(title);
  const cleanTitleText = cleanTitle(title);
  const formattedSummary = formatSummary(summary);
  
  // Fetch metadata for rich preview
  const metadata = await fetchUrlMetadata(cleanLink);
  const domain = new URL(cleanLink).hostname.replace('www.', '');
  
  // Get article publication date from metadata or use current date as fallback
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Try to get article publication time from metadata
  let timeStr = "";
  if (metadata?.publishedTime) {
    const pubDate = new Date(metadata.publishedTime);
    timeStr = pubDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
  
  // Create the main embed with newspaper styling
  const embed = {
    title: `📰 ${cleanTitleText}`,
    description: `*${formattedSummary}*\n\n**Read the full story:** [${metadata?.siteName || domain}](${cleanLink})`,
    url: cleanLink,
    color: config.color,
    author: {
      name: `${config.emoji} ${config.name}`,
      icon_url: "https://tldr.tech/logo-jpg.jpg"
    },
    fields: [
      {
        name: "‎",  // Empty name for spacing
        value: timeStr ? `${readTime ? `**${readTime} min read** • ` : ''}${timeStr}` : (readTime ? `**${readTime} min read**` : ''),
        inline: false
      }
    ],
    footer: {
      text: `TLDR Newsletter • ${getTodayDateSF()}`,
      icon_url: "https://tldr.tech/logo-jpg.jpg"
    }
  };

  // Add image if available
  if (metadata?.image) {
    embed.image = {
      url: metadata.image
    };
  }

  // Add thumbnail for site favicon if available
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  embed.thumbnail = {
    url: faviconUrl
  };

  return embed;
}

export async function postCategoryHeader(category, dateStr) {
  const config = CATEGORY_CONFIG[category];
  await axios.post(WEBHOOK_URL, {
    content: `## ${config.emoji} **${config.name}**\n*${dateStr} • Today's top stories and insights*`,
    username: config.name,
    avatar_url: "https://tldr.tech/logo-jpg.jpg"
  });
  await sleep(1000);
}

export async function postArticle(title, summary, url, category) {
  const config = CATEGORY_CONFIG[category];
  const embed = await makeEmbed(title, summary, url, category);
  await axios.post(WEBHOOK_URL, {
    embeds: [embed],
    username: config.name,
    avatar_url: "https://tldr.tech/logo-jpg.jpg"
  });
  await sleep(1500);
} 
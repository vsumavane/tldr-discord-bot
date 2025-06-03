import axios from 'axios';
import dotenv from 'dotenv';
import { CATEGORY_CONFIG, DISCORD_COLORS } from '../config.js';
import { cleanUrl, extractReadTime, cleanTitle, formatSummary, getTodayDateSF, sleep, fetchUrlMetadata } from '../utils.js';

dotenv.config();

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Content type detection and styling
function detectContentType(title) {
  const contentTypes = {
    'github repo': { emoji: '🧑‍💻', color: 0x24292e, style: 'github' },
    'book': { emoji: '📚', color: 0x8B4513, style: 'book' },
    'tool': { emoji: '🛠️', color: 0x2ECC71, style: 'tool' }
  };

  for (const [type, config] of Object.entries(contentTypes)) {
    if (title.toLowerCase().includes(`(${type})`)) {
      return {
        type,
        ...config,
        cleanTitle: title.replace(`(${type})`, '').trim()
      };
    }
  }

  return null;
}

async function makeEmbed(title, summary, url, category) {
  const config = CATEGORY_CONFIG[category];
  const cleanLink = cleanUrl(url);
  const readTime = extractReadTime(title);
  const formattedSummary = formatSummary(summary);
  
  // Detect content type and get styling
  const contentType = detectContentType(title);
  const cleanTitleText = contentType ? contentType.cleanTitle : cleanTitle(title);
  
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

  // Base embed configuration
  const embed = {
    title: contentType ? `${contentType.emoji} ${cleanTitleText}` : `📰 ${cleanTitleText}`,
    description: contentType?.style === 'github' 
      ? `*${formattedSummary}*\n\n**View on GitHub:** [${cleanTitleText}](${cleanLink})`
      : `*${formattedSummary}*\n\n**Read the full story:** [${metadata?.siteName || domain}](${cleanLink})`,
    url: cleanLink,
    color: contentType ? contentType.color : config.color,
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

  // Special handling for different content types
  if (contentType) {
    switch (contentType.style) {
      case 'github':
        // GitHub-style embed
        embed.color = 0x24292e; // GitHub dark theme color
        embed.thumbnail = {
          url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
        };
        
        // Add repository avatar if available
        if (metadata?.image) {
          // Add the repository avatar as an image
          embed.image = {
            url: metadata.image
          };
        }
        break;
      case 'book':
        // Book-style embed with cover image
        if (metadata?.image) {
          embed.image = {
            url: metadata.image
          };
        }
        break;
      case 'tool':
        // Tool-style embed
        embed.thumbnail = {
          url: 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=32'
        };
        break;
    }
  } else {
    // Default embed behavior
    if (metadata?.image) {
      embed.image = {
        url: metadata.image
      };
    }
    embed.thumbnail = {
      url: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    };
  }

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
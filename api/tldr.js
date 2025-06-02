import axios from "axios";
import * as cheerio from "cheerio";
import { CATEGORY_CONFIG } from './config.js';
import { getTodayDateIST } from './utils.js';
import { getPostedCategories, markCategoryAsPosted } from './services/storage.js';
import { postCategoryHeader, postArticle } from './services/discord.js';

function cleanUrl(url) {
  try {
    // Parse the URL
    const urlObj = new URL(url);
    
    // Remove UTM parameters and other tracking parameters
    const paramsToRemove = [
      'utm_source', 'utm_medium', 'utm_campaign', 
      'utm_term', 'utm_content', 'ref', 'source'
    ];
    
    paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
    
    // Return the cleaned URL
    return urlObj.toString();
  } catch (error) {
    console.error('Error cleaning URL:', error);
    return url; // Return original URL if parsing fails
  }
}

function extractReadTime(title) {
  const match = title.match(/\((\d+)\s+minute\s+read\)/i);
  return match ? match[1] : null;
}

function cleanTitle(title) {
  return title.replace(/\(\d+\s+minute\s+read\)/i, '').trim();
}

function formatSummary(summary) {
  // Split into sentences and limit to 5 sentences
  const sentences = summary.match(/[^.!?]+[.!?]+/g) || [];
  const limitedSentences = sentences.slice(0, 5);
  return limitedSentences.join(' ').trim();
}

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
    color: 0x5865F2, // Discord blurple
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
      text: `${config.emoji} ${config.name} • ${getTodayDateIST()}`
    },
    timestamp: new Date().toISOString()
  };
}

async function checkAndPostCategory(category, dateStr) {
  const url = `https://tldr.tech/${category}/${dateStr}`;
  
  try {
    const response = await axios.get(url, { 
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      }
    });

    if (response.request.res.responseUrl.includes('/' + category + '/')) {
      const $ = cheerio.load(response.data);
      const articles = $("article");

      // Post category header
      await postCategoryHeader(category, dateStr);

      let posted = 0;
      for (const el of articles) {
        const title = $(el).find("h3").text().trim();
        const link = $(el).find("a").attr("href") || "";
        const summary = $(el).find(".newsletter-html").text().trim();

        if (!title || !summary || !link || link.includes("sponsor")) continue;

        await postArticle(title, summary, link, category);
        posted++;
      }

      if (posted > 0) {
        await markCategoryAsPosted(category, dateStr);
        return posted;
      }
    }
    return 0;
  } catch (err) {
    console.error(`Failed for ${category}:`, err.message);
    return 0;
  }
}

export default async function handler(req, res) {
  const dateStr = getTodayDateIST();
  if (!dateStr) return res.status(200).send("Weekend – no newsletters.");

  const postedCategories = await getPostedCategories();
  const postedToday = postedCategories.filter(cat => cat.startsWith(dateStr));
  
  const categoriesToCheck = Object.keys(CATEGORY_CONFIG).filter(
    category => !postedToday.includes(`${dateStr}_${category}`)
  );

  if (categoriesToCheck.length === 0) {
    return res.status(200).send("All categories for today have been posted.");
  }

  let totalPosted = 0;
  for (const category of categoriesToCheck) {
    const posted = await checkAndPostCategory(category, dateStr);
    totalPosted += posted;
  }

  res.status(200).send(`Posted ${totalPosted} new TLDR articles. ${categoriesToCheck.length - totalPosted} categories still pending.`);
}

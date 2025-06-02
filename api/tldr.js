import axios from "axios";
import * as cheerio from "cheerio";
import { CATEGORY_CONFIG } from './config.js';
import { getTodayDateSF } from './utils.js';
import { getPostedCategories, markCategoryAsPosted } from './services/storage.js';
import { postCategoryHeader, postArticle } from './services/discord.js';
import Logger from './utils/logger.js';

Logger.info('Script execution started - Logger Info');

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
      text: `${config.emoji} ${config.name} • ${getTodayDateSF()}`
    },
    timestamp: new Date().toISOString()
  };
}

async function checkAndPostCategory(category, dateStr) {
  Logger.info(`Checking category: ${category} for date: ${dateStr}`);
  const url = `https://tldr.tech/${category}/${dateStr}`;
  
  try {
    const response = await axios.get(url, { 
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      }
    });

    if (response.request.res.responseUrl.includes('/' + category + '/')) {
      Logger.info(`News found for category: ${category}`);
      const $ = cheerio.load(response.data);
      const articles = $("article");

      // Post category header
      await postCategoryHeader(category, dateStr);

      let posted = 0;
      for (const el of articles) {
        const title = $(el).find("h3").text().trim();
        const link = $(el).find("a").attr("href") || "";
        const summary = $(el).find(".newsletter-html").text().trim();

        if (!title || !summary || !link || link.includes("sponsor")) {
          Logger.warn(`Skipping article due to missing info or sponsor link: ${title}`);
          continue;
        }

        await postArticle(title, summary, link, category);
        posted++;
        Logger.info(`Posted article: ${title} for category: ${category}`);
      }

      if (posted > 0) {
        await markCategoryAsPosted(category, dateStr);
        Logger.info(`Finished posting ${posted} articles for category: ${category}. Marked as posted.`);
        return posted; // Return number of articles posted
      } else {
        Logger.info(`No articles to post for category: ${category}`);
        return 0; // Return 0 if no articles were posted
      }
    } else {
      Logger.info(`No news released yet for category: ${category}. Redirected to homepage.`);
      return 0; // Return 0 if no news was released
    }
  } catch (err) {
    Logger.error(`Failed to check or post for ${category}:`, err.message);
    return 0; // Return 0 on error
  }
}

async function main() {
  Logger.info('Starting TLDR Discord Bot execution.');
  const dateStr = getTodayDateSF();
  Logger.info(`Date string result (SF time): ${dateStr}`);
  Logger.info(`Checking if today is a weekend.`);
  if (!dateStr) {
    Logger.info("Weekend – no newsletters to post.");
    return;
  }

  const postedCategories = await getPostedCategories(dateStr);
  Logger.info(`Fetched already posted categories: ${JSON.stringify(postedCategories)}`);
  const categoriesToCheck = Object.keys(CATEGORY_CONFIG).filter(
    category => !postedCategories.includes(category)
  );

  if (categoriesToCheck.length === 0) {
    Logger.info("All categories for today have been posted.");
    return;
  }
  Logger.info(`Categories to check today: ${JSON.stringify(categoriesToCheck)}`);

  let totalPosted = 0;
  let successfullyPostedCategoriesCount = 0;
  for (const category of categoriesToCheck) {
    const postedCount = await checkAndPostCategory(category, dateStr);
    totalPosted += postedCount;
    if (postedCount > 0) {
      successfullyPostedCategoriesCount++;
    }
  }

  Logger.info(`Total new TLDR articles posted today: ${totalPosted}.`);
  const categoriesPending = categoriesToCheck.length - successfullyPostedCategoriesCount;
  Logger.info(`Posted ${totalPosted} new TLDR articles. ${categoriesPending} categories still pending.`);
}

// Run the main function
main().catch(error => {
  Logger.error('Error during script execution:', error);
  process.exit(1);
});

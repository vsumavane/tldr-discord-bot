import axios from 'axios';
import * as cheerio from 'cheerio';
import URLParse from 'url-parse';

export function getTodayDateSF() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long'
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const dayOfMonth = parts.find(p => p.type === 'day').value;
  const weekday = parts.find(p => p.type === 'weekday').value;

  // Check if weekend based on SF time
  if (weekday === 'Saturday' || weekday === 'Sunday') {
    return null;
  }

  // Format as YYYY-MM-DD
  return `${year}-${month}-${dayOfMonth}`;
}

export function cleanUrl(url) {
  try {
    const parsedUrl = new URLParse(url, true);
    const paramsToRemove = [
      'utm_source', 'utm_medium', 'utm_campaign', 
      'utm_term', 'utm_content', 'ref', 'source'
    ];
    
    // Remove tracking parameters
    paramsToRemove.forEach(param => {
      delete parsedUrl.query[param];
    });
    
    // Remove empty query string
    if (Object.keys(parsedUrl.query).length === 0) {
      parsedUrl.set('query', '');
    }
    
    return parsedUrl.toString();
  } catch (error) {
    console.error('Error cleaning URL:', error);
    return url;
  }
}

export function extractReadTime(title) {
  const match = title.match(/\((\d+)\s+minute\s+read\)/i);
  return match ? match[1] : null;
}

export function cleanTitle(title) {
  return title.replace(/\(\d+\s+minute\s+read\)/i, '').trim();
}

export function formatSummary(summary) {
  // Split into sentences and limit to 5 sentences
  const sentences = summary.match(/[^.!?]+[.!?]+/g) || [];
  const limitedSentences = sentences.slice(0, 5);
  return limitedSentences.join(' ').trim();
}

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchUrlMetadata(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TLDRBot/1.0; +https://tldr.tech)',
      },
      timeout: 5000,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract metadata with improved image handling
    const metadata = {
      title: $('meta[property="og:title"]').attr('content') || 
             $('meta[name="twitter:title"]').attr('content') || 
             $('title').text() || '',
      description: $('meta[property="og:description"]').attr('content') || 
                  $('meta[name="twitter:description"]').attr('content') || 
                  $('meta[name="description"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || 
             $('meta[name="twitter:image"]').attr('content') || 
             $('meta[property="og:image:secure_url"]').attr('content') || 
             $('meta[name="twitter:image:src"]').attr('content') || '',
      siteName: $('meta[property="og:site_name"]').attr('content') || 
                new URLParse(url).hostname.replace('www.', ''),
      publishedTime: null
    };

    // Enhanced publication time detection
    const possibleDateSelectors = [
      // Meta tags
      'meta[property="article:published_time"]',
      'meta[name="pubdate"]',
      'meta[name="publishdate"]',
      'meta[name="date"]',
      'meta[name="DC.date.issued"]',
      'meta[name="article:published_time"]',
      'meta[name="publication-date"]',
      'meta[name="publication_date"]',
      'meta[name="publish_date"]',
      'meta[name="date.created"]',
      'meta[name="date.published"]',
      'meta[name="date_created"]',
      'meta[name="date_published"]',
      'meta[name="datePublished"]',
      'meta[name="dateCreated"]',
      'meta[name="date-modified"]',
      'meta[name="date_modified"]',
      'meta[name="dateModified"]',
      'meta[name="last-modified"]',
      'meta[name="last_modified"]',
      'meta[name="lastModified"]',
      // Time elements
      'time[datetime]',
      'time[pubdate]',
      // Schema.org markup
      '[itemprop="datePublished"]',
      '[itemprop="dateCreated"]',
      '[itemprop="dateModified"]',
      // Common date classes
      '.date',
      '.published',
      '.post-date',
      '.article-date',
      '.entry-date',
      '.timestamp',
      '.time',
      '.post-time',
      '.article-time',
      '.entry-time'
    ];

    // Try to find publication date using various selectors
    for (const selector of possibleDateSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const dateStr = element.attr('datetime') || element.attr('content') || element.text();
        if (dateStr) {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            metadata.publishedTime = parsedDate.toISOString();
            break;
          }
        }
      }
    }

    // If no date found in meta tags or structured data, try to find it in the content
    if (!metadata.publishedTime) {
      // Look for common date patterns in the content
      const datePatterns = [
        /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, // YYYY-MM-DD or YYYY/MM/DD
        /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/, // DD-MM-YYYY or DD/MM/YYYY
        /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i, // DD Month YYYY
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i // Month DD, YYYY
      ];

      const content = $('article, .article, .post, .entry, .content, main').text();
      for (const pattern of datePatterns) {
        const match = content.match(pattern);
        if (match) {
          const dateStr = match[0];
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            metadata.publishedTime = parsedDate.toISOString();
            break;
          }
        }
      }
    }

    // Clean up the metadata
    metadata.title = metadata.title.trim();
    metadata.description = metadata.description.trim();
    metadata.siteName = metadata.siteName.trim();

    // Handle relative image URLs
    if (metadata.image && !metadata.image.startsWith('http')) {
      const baseUrl = new URLParse(url);
      metadata.image = baseUrl.origin + (metadata.image.startsWith('/') ? '' : '/') + metadata.image;
    }

    return metadata;
  } catch (error) {
    console.error('Error fetching URL metadata:', error.message);
    return null;
  }
} 
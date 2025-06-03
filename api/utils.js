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
                new URLParse(url).hostname.replace('www.', '')
    };

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
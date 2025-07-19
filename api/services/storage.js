import { Redis } from '@upstash/redis';
import Logger from '../utils/logger.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Fetches the list of keys (posted categories) for the current date from the Upstash KV store.
export async function getPostedCategories(date) {
  try {
    Logger.info(`Attempting to fetch keys from Upstash Redis for pattern: ${date}_*`);
    // Use the KEYS command to list keys matching the pattern for the current date
    const keys = await redis.keys(`${date}_*`);
    Logger.info(`Raw keys from Upstash Redis: ${JSON.stringify(keys)}`);
    if (Array.isArray(keys)) {
      // We only need the category part of the key (e.g., 'tech' from '2025-06-03_tech')
      const postedCategories = keys.map(key => key.replace(`${date}_`, ''));
      Logger.info(`Successfully processed fetched keys for date ${date}: ${JSON.stringify(postedCategories)}`);
      return postedCategories;
    } else {
      Logger.error(`Unexpected response format from Upstash Redis /keys for date ${date}. Data: ${JSON.stringify(keys)}`);
      return [];
    }
  } catch (error) {
    Logger.error(`Error fetching posted categories from Upstash Redis for date ${date}:`, error.message);
    return [];
  }
}

// Marks a specific category as posted for a given date in the Upstash KV store.
export async function markCategoryAsPosted(category, date) {
  try {
    const key = `${date}_${category}`;
    const expiryInSeconds = 2 * 24 * 60 * 60; // 2 days
    Logger.info(`Attempting to set key in Upstash Redis: ${key} with expiry ${expiryInSeconds}s`);
    await redis.set(key, true, { ex: expiryInSeconds });
    Logger.info(`Successfully marked category ${category} as posted in Upstash Redis for date ${date}. Key: ${key}`);
  } catch (error) {
    Logger.error(`Error marking category ${category} as posted in Upstash Redis for date ${date}:`, error.message);
  }
} 
import axios from 'axios';
import dotenv from 'dotenv';
import Logger from '../utils/logger.js';

dotenv.config();

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

// Fetches the list of keys (posted categories) for the current date from the Upstash KV store.
export async function getPostedCategories(date) {
  try {
    // Use the KEYS command via the REST API to list keys matching the pattern for the current date
    Logger.info(`Attempting to fetch keys from Upstash KV for pattern: ${date}_*`);
    const response = await axios.get(`${KV_REST_API_URL}/keys/${date}_*`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` },
      // Do not validate status here, we want to see the raw response for debugging
      validateStatus: () => true,
    });

    Logger.info(`Raw response status from Upstash KV /keys: ${response.status}`);
    Logger.info(`Raw response data from Upstash KV /keys: ${JSON.stringify(response.data)}`);

    // Upstash KEYS command successful response (status 200) returns an object with a 'result' array
    if (response.status === 200 && response.data && Array.isArray(response.data.result)) {
        const keys = response.data.result; // Access the array within the 'result' property
         // We only need the category part of the key (e.g., 'tech' from '2025-06-03_tech')
        const postedCategories = keys.map(key => key.replace(`${date}_`, ''));
        Logger.info(`Successfully processed fetched keys for date ${date}: ${JSON.stringify(postedCategories)}`);
        return postedCategories;
    } else {
        // If status is not 200 or data is not in expected format, log and return empty array
        Logger.error(`Unexpected response format from Upstash KV /keys for date ${date}. Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
        return [];
    }

  } catch (error) {
    // Log the full error response for debugging
    if (error.response) {
      Logger.error(`Error fetching posted categories from Upstash KV for date ${date}:`, error.response.data);
    } else {
      Logger.error(`Error fetching posted categories from Upstash KV for date ${date}:`, error.message);
    }
    return [];
  }
}

// Marks a specific category as posted for a given date in the Upstash KV store.
export async function markCategoryAsPosted(category, date) {
  try {
    const key = `${date}_${category}`;
    // Use the SET command via the REST API to set a key indicating the category was posted
    // Set an expiry (e.g., 24 hours) for the key to automatically clean up old entries
    const expiryInSeconds = 24 * 60 * 60; // 24 hours
    Logger.info(`Attempting to set key in Upstash KV: ${key} with expiry ${expiryInSeconds}s`);
    const response = await axios.post(`${KV_REST_API_URL}/set/${key}`, 
      { value: true, ex: expiryInSeconds }, // Set the value to true and add expiry
      { headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` } }
    );
     Logger.info(`Raw response status from Upstash KV /set: ${response.status}`);
     Logger.info(`Raw response data from Upstash KV /set: ${JSON.stringify(response.data)}`);

     if (response.status >= 200 && response.status < 300) {
        Logger.info(`Successfully marked category ${category} as posted in Upstash KV for date ${date}. Key: ${key}`);
     } else {
         Logger.error(`Failed to mark category ${category} as posted in Upstash KV for date ${date}. Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
     }

  } catch (error) {
    // Log the full error response for debugging
     if (error.response) {
      Logger.error(`Error marking category ${category} as posted in Upstash KV for date ${date}:`, error.response.data);
    } else {
      Logger.error(`Error marking category ${category} as posted in Upstash KV for date ${date}:`, error.message);
    }
  }
} 
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const KV_STORE_URL = process.env.KV_STORE_URL;
const KV_STORE_TOKEN = process.env.KV_STORE_TOKEN;

// Fetches the list of categories that have already been posted for the current day from the Upstash KV store.
export async function getPostedCategories() {
  try {
    const response = await axios.get(`${KV_STORE_URL}/posted_categories`, {
      headers: { Authorization: `Bearer ${KV_STORE_TOKEN}` }
    });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching posted categories from Upstash KV:', error);
    return [];
  }
}

// Marks a specific category as posted for a given date in the Upstash KV store.
export async function markCategoryAsPosted(category, date) {
  try {
    const key = `${date}_${category}`;
    await axios.post(`${KV_STORE_URL}/posted_categories`, 
      { key, value: true },
      { headers: { Authorization: `Bearer ${KV_STORE_TOKEN}` } }
    );
  } catch (error) {
    console.error('Error marking category as posted in Upstash KV:', error);
  }
} 
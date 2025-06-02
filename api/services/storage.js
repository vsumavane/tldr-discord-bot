import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const KV_STORE_URL = process.env.KV_STORE_URL;
const KV_STORE_TOKEN = process.env.KV_STORE_TOKEN;

export async function getPostedCategories() {
  try {
    const response = await axios.get(`${KV_STORE_URL}/posted_categories`, {
      headers: { Authorization: `Bearer ${KV_STORE_TOKEN}` }
    });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching posted categories:', error);
    return [];
  }
}

export async function markCategoryAsPosted(category, date) {
  try {
    const key = `${date}_${category}`;
    await axios.post(`${KV_STORE_URL}/posted_categories`, 
      { key, value: true },
      { headers: { Authorization: `Bearer ${KV_STORE_TOKEN}` } }
    );
  } catch (error) {
    console.error('Error marking category as posted:', error);
  }
} 
export function getTodayDateIST() {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 5.5);
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return null; // Weekend
  return now.toISOString().slice(0, 10);
}

export function cleanUrl(url) {
  try {
    const urlObj = new URL(url);
    const paramsToRemove = [
      'utm_source', 'utm_medium', 'utm_campaign', 
      'utm_term', 'utm_content', 'ref', 'source'
    ];
    paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
    return urlObj.toString();
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
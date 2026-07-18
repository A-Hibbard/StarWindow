import sendRequest from './send-request';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const NEWS_URL = `${API_BASE}/api/news`;

export type NewsArticle = {
  title?: string | null;
  summary?: string | null;
  url?: string | null;
  image_url?: string | null;
  published_at?: string | null;
  source?: string | null;
};

export type NewsResponse = {
  count?: number;
  results?: NewsArticle[];
};

export async function fetchNasaNews({
  limit = 1,
}: {
  limit?: number;
} = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    source: 'NASA News',
  });

  return sendRequest<null, NewsResponse>(`${NEWS_URL}?${params}`);
}

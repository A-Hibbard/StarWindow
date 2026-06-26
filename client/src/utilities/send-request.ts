import { getToken } from './users-service';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export default async function sendRequest<TPayload = unknown, TResponse = unknown>(
  url: string,
  method: Method = 'GET',
  payload: TPayload | null = null
): Promise<TResponse> {
  const options: RequestInit = { method };

  if (payload) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(payload);
  }

  const token = getToken();
  if (token) {
    options.headers = options.headers || {};
    (options.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, options);
  const data = await res.json().catch(() => null);

  if (res.ok) return data as TResponse;

  const message =
    data?.msg ||
    data?.error ||
    data?.message ||
    `Request failed with status ${res.status}`;
  throw new Error(message);
}

import sendRequest from './send-request';
import type { LoginCredentials, SignUpData } from './users-service';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3005';
const BASE_URL = `${API_BASE}/api/users`;

export function signUp(userData: SignUpData): Promise<string> {
  return sendRequest(BASE_URL, 'POST', userData);
}

export function login(credentials: LoginCredentials): Promise<string> {
  return sendRequest(`${BASE_URL}/login`, 'POST', credentials);
}

export function checkToken(): Promise<string> {
  return sendRequest(`${BASE_URL}/check-token`);
}

export function saveEventTypes(eventTypeIds: number[]): Promise<{ eventTypeIds: number[] }> {
  return sendRequest(`${BASE_URL}/event-types`, 'PUT', { eventTypeIds });
}

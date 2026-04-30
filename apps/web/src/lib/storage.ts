import type { AuthTokens } from './api';
import type { WebCollection } from './collection';

const AUTH_KEY = 'figcontrol.auth.v1';
const COLLECTION_KEY = 'figcontrol.collection.world-cup-2026.v1';

export function saveAuth(tokens: AuthTokens) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(tokens));
}

export function loadAuth(): AuthTokens | null {
  return readJson<AuthTokens>(AUTH_KEY);
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

export function saveCollection(collection: WebCollection) {
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection));
}

export function loadCollection(): WebCollection | null {
  return readJson<WebCollection>(COLLECTION_KEY);
}

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

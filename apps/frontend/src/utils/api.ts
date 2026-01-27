/**
 * API utility for making authenticated HTTP requests
 */

const TOKEN_STORAGE_KEY = 'caladrius_auth_token';

/**
 * Get the authentication token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Create headers with authentication token
 */
function createAuthHeaders(additionalHeaders: Record<string, string> = {}): Headers {
  const headers = new Headers(additionalHeaders);
  const token = getAuthToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

/**
 * Make an authenticated GET request
 */
export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: createAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Make an authenticated POST request
 */
export async function apiPost<T>(
  url: string,
  data?: unknown
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: createAuthHeaders({ 'Content-Type': 'application/json' }),
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Make an authenticated PUT request
 */
export async function apiPut<T>(
  url: string,
  data?: unknown
): Promise<T> {
  const response = await fetch(url, {
    method: 'PUT',
    headers: createAuthHeaders({ 'Content-Type': 'application/json' }),
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Make an authenticated DELETE request
 */
export async function apiDelete(url: string): Promise<void> {
  const response = await fetch(url, {
    method: 'DELETE',
    headers: createAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}

/**
 * Make an authenticated fetch request with custom options
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = createAuthHeaders(
    options.headers as Record<string, string> || {}
  );

  return fetch(url, {
    ...options,
    headers,
  });
}

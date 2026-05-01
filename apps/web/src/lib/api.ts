import type { AdminDashboard, AnalyticsEventType } from "@figcontrol/shared";
import type { WebCollection } from "./collection";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    isAdmin?: boolean;
  };
}

export interface AuthEmailResponse {
  success: boolean;
  message: string;
}

export async function register(
  email: string,
  password: string,
  confirmPassword: string,
): Promise<AuthEmailResponse> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, confirmPassword }),
  });
}

export async function login(
  email: string,
  password: string,
): Promise<AuthTokens> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  return request("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export async function requestEmailVerification(
  email: string,
): Promise<AuthEmailResponse> {
  return request("/auth/email-verifications/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmEmailVerification(
  token: string,
): Promise<{ success: boolean }> {
  return request("/auth/email-verifications/confirm", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function requestPasswordReset(
  email: string,
): Promise<AuthEmailResponse> {
  return request("/auth/password-resets", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset(
  token: string,
  password: string,
  confirmPassword: string,
): Promise<{ success: boolean }> {
  return request("/auth/password-resets/confirm", {
    method: "POST",
    body: JSON.stringify({ token, password, confirmPassword }),
  });
}

export async function getCollection(
  accessToken: string,
): Promise<WebCollection> {
  return request("/me/collection/world-cup-2026", {
    headers: authHeaders(accessToken),
  });
}

export async function getAdminDashboard(
  accessToken: string,
): Promise<AdminDashboard> {
  return request("/admin/dashboard", {
    headers: authHeaders(accessToken),
  });
}

export async function setStickerQuantity(
  accessToken: string,
  stickerId: string,
  quantity: number,
): Promise<WebCollection> {
  return request(
    `/me/collection/world-cup-2026/stickers/${encodeURIComponent(stickerId)}`,
    {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ quantity }),
    },
  );
}

export async function trackAnalyticsEvent(
  accessToken: string,
  eventType: AnalyticsEventType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await request<{ success: boolean }>("/analytics/events", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ eventType, metadata }),
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      readErrorMessage(body) || `Request failed with ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

function readErrorMessage(body: string): string | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as {
      message?: string | string[];
      error?: string;
    };
    if (Array.isArray(parsed.message)) return parsed.message.join(" ");
    return parsed.message ?? parsed.error ?? body;
  } catch {
    return body;
  }
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

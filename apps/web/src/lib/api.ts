import type {
  AdminDashboard,
  AnalyticsEventType,
  LeaderboardDto,
  NicknameAvailabilityDto,
  UpdateProfileDto,
  UserProfileDto,
} from "@figcontrol/shared";
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

export type RefreshTokens = (refreshToken: string) => Promise<AuthTokens>;

const inFlightRefreshes = new Map<string, Promise<AuthTokens>>();

export async function runWithFreshAccessToken<T>(
  tokens: AuthTokens,
  requestWithAccessToken: (accessToken: string) => Promise<T>,
  onRefresh: (tokens: AuthTokens) => void,
  refreshTokens: RefreshTokens = refresh,
): Promise<T> {
  try {
    return await requestWithAccessToken(tokens.accessToken);
  } catch (error) {
    if (!isAccessTokenError(error)) {
      throw error;
    }

    const refreshed = await refreshOnce(tokens.refreshToken, refreshTokens);
    onRefresh(refreshed);
    return requestWithAccessToken(refreshed.accessToken);
  }
}

export function isAccessTokenError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /invalid bearer token|missing bearer token/i.test(error.message);
}

function refreshOnce(
  refreshToken: string,
  refreshTokens: RefreshTokens,
): Promise<AuthTokens> {
  const existing = inFlightRefreshes.get(refreshToken);
  if (existing) return existing;

  const nextRefresh = refreshTokens(refreshToken).finally(() => {
    inFlightRefreshes.delete(refreshToken);
  });
  inFlightRefreshes.set(refreshToken, nextRefresh);
  return nextRefresh;
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

export async function getProfile(accessToken: string): Promise<UserProfileDto> {
  return request("/me/profile", {
    headers: authHeaders(accessToken),
  });
}

export async function updateProfile(
  accessToken: string,
  profile: UpdateProfileDto,
): Promise<UserProfileDto> {
  return request("/me/profile", {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(profile),
  });
}

export async function checkNicknameAvailability(
  accessToken: string,
  nickname: string,
): Promise<NicknameAvailabilityDto> {
  return request(
    `/profiles/nickname-availability?nickname=${encodeURIComponent(nickname)}`,
    {
      headers: authHeaders(accessToken),
    },
  );
}

export async function joinLeaderboard(
  accessToken: string,
): Promise<UserProfileDto> {
  return request("/me/profile/leaderboard/join", {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

export async function getLeaderboard(
  accessToken: string,
): Promise<LeaderboardDto> {
  return request("/leaderboard/world-cup-2026", {
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

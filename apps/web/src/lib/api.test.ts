import { describe, expect, it, vi } from "vitest";
import {
  isAccessTokenError,
  runWithFreshAccessToken,
  type AuthTokens,
} from "./api";

const baseTokens: AuthTokens = {
  accessToken: "old-access",
  refreshToken: "old-refresh",
  user: {
    id: "user-1",
    email: "user@example.com",
  },
};

describe("authenticated API helpers", () => {
  it("refreshes the access token once when the API rejects an expired bearer token", async () => {
    const refreshedTokens: AuthTokens = {
      ...baseTokens,
      accessToken: "new-access",
      refreshToken: "new-refresh",
    };
    const onRefresh = vi.fn();
    const refreshTokens = vi.fn().mockResolvedValue(refreshedTokens);
    const requestWithAccessToken = vi
      .fn()
      .mockRejectedValueOnce(new Error("Invalid bearer token."))
      .mockResolvedValueOnce("ok");

    await expect(
      runWithFreshAccessToken(
        baseTokens,
        requestWithAccessToken,
        onRefresh,
        refreshTokens,
      ),
    ).resolves.toBe("ok");

    expect(refreshTokens).toHaveBeenCalledWith("old-refresh");
    expect(onRefresh).toHaveBeenCalledWith(refreshedTokens);
    expect(requestWithAccessToken).toHaveBeenNthCalledWith(1, "old-access");
    expect(requestWithAccessToken).toHaveBeenNthCalledWith(2, "new-access");
  });

  it("does not refresh for non-authenticated request errors", async () => {
    const refreshTokens = vi.fn();

    await expect(
      runWithFreshAccessToken(
        baseTokens,
        async () => {
          throw new Error("Network failed");
        },
        vi.fn(),
        refreshTokens,
      ),
    ).rejects.toThrow("Network failed");

    expect(refreshTokens).not.toHaveBeenCalled();
  });

  it("reuses an in-flight refresh for concurrent expired-token calls", async () => {
    const refreshedTokens: AuthTokens = {
      ...baseTokens,
      accessToken: "shared-access",
      refreshToken: "shared-refresh",
    };
    const refreshTokens = vi.fn().mockResolvedValue(refreshedTokens);
    const onRefresh = vi.fn();
    const firstRequest = vi
      .fn()
      .mockRejectedValueOnce(new Error("Invalid bearer token."))
      .mockResolvedValueOnce("first");
    const secondRequest = vi
      .fn()
      .mockRejectedValueOnce(new Error("Invalid bearer token."))
      .mockResolvedValueOnce("second");

    await expect(
      Promise.all([
        runWithFreshAccessToken(
          baseTokens,
          firstRequest,
          onRefresh,
          refreshTokens,
        ),
        runWithFreshAccessToken(
          baseTokens,
          secondRequest,
          onRefresh,
          refreshTokens,
        ),
      ]),
    ).resolves.toEqual(["first", "second"]);

    expect(refreshTokens).toHaveBeenCalledTimes(1);
    expect(firstRequest).toHaveBeenNthCalledWith(2, "shared-access");
    expect(secondRequest).toHaveBeenNthCalledWith(2, "shared-access");
  });

  it("recognizes bearer token errors from the API", () => {
    expect(isAccessTokenError(new Error("Invalid bearer token."))).toBe(true);
    expect(isAccessTokenError(new Error("Missing bearer token."))).toBe(true);
    expect(isAccessTokenError(new Error("Invalid refresh token."))).toBe(false);
  });
});

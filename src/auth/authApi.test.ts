import { afterEach, describe, expect, it, vi } from "vitest";

const authPayload = {
  user: {
    id: "user-1",
    email: "admin@datatrade.local",
    username: "admin",
    status: "active",
    roles: ["user", "admin"],
  },
  session: {
    id: "session-1",
    expiresAt: "2099-01-01T00:00:00.000Z",
  },
  accessToken: "access-token",
  refreshToken: "refresh-token-value-that-is-long-enough",
  tokenType: "Bearer",
  accessTokenExpiresAt: "2099-01-01T00:15:00.000Z",
};

function jsonResponse(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function importAuthApi() {
  vi.resetModules();
  vi.stubEnv("VITE_DATA_TRADE_API_URL", "http://localhost:8788");
  return import("./authApi");
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SisLoPe Data Trade handoff auth", () => {
  it("canjea handoff sin enviar credenciales ni tokens por URL", async () => {
    const authApi = await importAuthApi();
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input.endsWith("/auth/handoff/exchange")) {
        expect(init?.body).toBe(JSON.stringify({
          code: "handoff-code-value-that-is-long-enough",
          targetModule: "sislope",
        }));
        return jsonResponse(authPayload);
      }

      return jsonResponse({ error: { code: "NOT_MOCKED" } }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const session = await authApi.exchangeHandoffCode("handoff-code-value-that-is-long-enough");

    expect(session.user.email).toBe("admin@datatrade.local");
    expect(session.user.role).toBe("admin");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8788/auth/handoff/exchange",
      expect.objectContaining({
        method: "POST",
      }),
    );
    const requestBody = String(fetchMock.mock.calls[0]?.[1]?.body ?? "");
    expect(requestBody).not.toContain("access-token");
    expect(requestBody).not.toContain("refresh-token");
    expect(requestBody).not.toContain("admin@datatrade.local");
  });

  it("fetchCurrentSession usa /auth/me con Bearer despues del handoff", async () => {
    const authApi = await importAuthApi();
    const fetchMock = vi.fn((input: string) => {
      if (input.endsWith("/auth/handoff/exchange")) return jsonResponse(authPayload);
      if (input.endsWith("/auth/me")) {
        return jsonResponse({
          user: authPayload.user,
          session: authPayload.session,
        });
      }

      return jsonResponse({ error: { code: "NOT_MOCKED" } }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await authApi.exchangeHandoffCode("handoff-code-value-that-is-long-enough");
    fetchMock.mockClear();
    await authApi.fetchCurrentSession();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8788/auth/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
      }),
    );
  });
});

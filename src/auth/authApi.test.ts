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
  vi.unstubAllEnvs();
});

describe("SisLoPe Data Trade handoff auth", () => {
  it("loginWithPassword usa Data Trade Auth cuando VITE_DATA_TRADE_API_URL existe", async () => {
    const authApi = await importAuthApi();
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input.endsWith("/auth/login")) {
        expect(init?.body).toBe(JSON.stringify({
          identifier: "admin@datatrade.local",
          password: "fake-test-password",
        }));
        return jsonResponse(authPayload);
      }

      return jsonResponse({ error: { code: "NOT_MOCKED" } }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const session = await authApi.loginWithPassword("admin@datatrade.local", "fake-test-password");

    expect(session.user.email).toBe("admin@datatrade.local");
    expect(session.user.role).toBe("admin");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8788/auth/login",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("loginWithPassword conserva fallback legacy si no hay Data Trade API", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_DATA_TRADE_API_URL", "");
    const authApi = await import("./authApi");
    const legacyPayload = {
      user: {
        id: "legacy-user",
        email: "legacy@sislope.local",
        username: "legacy",
        role: "user",
        status: "active",
        mustChangePassword: false,
      },
      session: {
        id: "legacy-session",
        expiresAt: "2099-01-01T00:00:00.000Z",
      },
    };
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === "/api/auth/login") {
        expect(init?.body).toBe(JSON.stringify({
          identifier: "legacy@sislope.local",
          password: "legacy-pass",
        }));
        return jsonResponse(legacyPayload);
      }

      return jsonResponse({ error: { code: "NOT_MOCKED" } }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    const session = await authApi.loginWithPassword("legacy@sislope.local", "legacy-pass");

    expect(session.user.email).toBe("legacy@sislope.local");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

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

  it("trackDataTradeEvent usa Bearer despues del handoff", async () => {
    vi.stubEnv("VITE_DATA_TRADE_TRACKING_ENABLED", "true");
    const authApi = await importAuthApi();
    const fetchMock = vi.fn((input: string) => {
      if (input.endsWith("/auth/handoff/exchange")) return jsonResponse(authPayload);
      if (input.endsWith("/events/track")) return jsonResponse({ event: { id: "event-1" } }, 201);

      return jsonResponse({ error: { code: "NOT_MOCKED" } }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    await authApi.exchangeHandoffCode("handoff-code-value-that-is-long-enough");
    fetchMock.mockClear();
    await authApi.trackDataTradeEvent("module_opened");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8788/events/track",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
        body: JSON.stringify({
          module: "sislope",
          eventName: "module_opened",
          metadata: {},
          path: window.location.pathname,
        }),
      }),
    );
  });
});

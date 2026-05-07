import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "./AuthContext";
import { useAuth } from "./authState";

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

function Probe() {
  const { status, user } = useAuth();

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{user?.email ?? "none"}</span>
    </div>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("AuthProvider handoff", () => {
  it("canjea handoff al cargar y limpia el query param", async () => {
    window.history.replaceState(null, "", "/?handoff=one-time-code&layer=ports");
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.endsWith("/auth/handoff/exchange")) return jsonResponse(authPayload);
      return jsonResponse({ error: { code: "NOT_MOCKED" } }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });
    expect(screen.getByTestId("email")).toHaveTextContent("admin@datatrade.local");
    expect(window.location.search).toBe("?layer=ports");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8788/auth/handoff/exchange",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          code: "one-time-code",
          targetModule: "sislope",
        }),
      }),
    );
  });
});

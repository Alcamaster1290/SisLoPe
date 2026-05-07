import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "./AuthContext";
import { GUEST_SESSION_STORAGE_KEY, useAuth } from "./authState";

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
  const { status, user, isGuest, loginAsGuest, logout } = useAuth();

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email">{user?.email ?? "none"}</span>
      <span data-testid="role">{user?.role ?? "none"}</span>
      <span data-testid="is-guest">{String(isGuest)}</span>
      <button data-testid="enter-guest" onClick={() => loginAsGuest()}>
        guest
      </button>
      <button
        data-testid="logout"
        onClick={() => {
          void logout();
        }}
      >
        logout
      </button>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
  window.localStorage.clear();
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

describe("AuthProvider guest mode", () => {
  it("loginAsGuest authenticates without hitting the network and persists in localStorage", async () => {
    const fetchMock = vi.fn(() => jsonResponse({ error: { code: "NOT_MOCKED" } }, 404));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
    });

    fetchMock.mockClear();
    fireEvent.click(screen.getByTestId("enter-guest"));

    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    expect(screen.getByTestId("role")).toHaveTextContent("guest");
    expect(screen.getByTestId("is-guest")).toHaveTextContent("true");
    expect(window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY)).toBe("1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("guest session survives a remount via localStorage and skips the network call", async () => {
    window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, "1");
    const fetchMock = vi.fn(() => jsonResponse({ error: { code: "NOT_MOCKED" } }, 404));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    });
    expect(screen.getByTestId("role")).toHaveTextContent("guest");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logout from guest clears the localStorage flag and returns to unauthenticated", async () => {
    const fetchMock = vi.fn(() => jsonResponse({ error: { code: "NOT_MOCKED" } }, 404));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
    });

    fireEvent.click(screen.getByTestId("enter-guest"));
    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");

    await act(async () => {
      fireEvent.click(screen.getByTestId("logout"));
    });

    expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
    expect(screen.getByTestId("is-guest")).toHaveTextContent("false");
    expect(window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY)).toBeNull();
  });
});

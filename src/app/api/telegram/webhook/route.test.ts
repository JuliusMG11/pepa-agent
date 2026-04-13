import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock the telegram router so we don't execute real processing
vi.mock("@/lib/telegram/router", () => ({
  routeUpdate: vi.fn().mockResolvedValue(undefined),
}));

// Set required env vars before importing the route
beforeAll(() => {
  process.env.TELEGRAM_WEBHOOK_SECRET = "test-secret-token";
  process.env.TELEGRAM_BOT_TOKEN = "123456:test-bot-token";
  process.env.TELEGRAM_ALLOWED_USER_IDS = "111111,222222";
});

// Dynamic import so env vars are set before module evaluation
async function getHandler() {
  const mod = await import("./route");
  return mod.POST;
}

function makeRequest(options: {
  secret?: string | null;
  body?: Record<string, unknown>;
}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.secret !== undefined && options.secret !== null) {
    headers["X-Telegram-Bot-Api-Secret-Token"] = options.secret;
  }

  const body = options.body ?? {
    message: { from: { id: 111111 }, chat: { id: 111111 }, text: "/start" },
  };

  return new Request("http://localhost/api/telegram/webhook", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("Telegram webhook — security", () => {
  it("rejects request with wrong secret token (401)", async () => {
    const POST = await getHandler();
    const request = makeRequest({ secret: "wrong-secret" });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("rejects request with missing secret token (401)", async () => {
    const POST = await getHandler();
    const request = makeRequest({ secret: null });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("accepts request with correct secret token (200)", async () => {
    const POST = await getHandler();
    const request = makeRequest({ secret: "test-secret-token" });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("returns 400 for malformed JSON body", async () => {
    const POST = await getHandler();
    const request = new Request("http://localhost/api/telegram/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": "test-secret-token",
      },
      body: "not-valid-json{{{",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 200 for unknown user (silently rejects — no 401)", async () => {
    // Telegram best practice: don't leak info about auth to unknown users
    const POST = await getHandler();
    const request = makeRequest({
      secret: "test-secret-token",
      body: {
        message: {
          from: { id: 999999 }, // not in allowed list
          chat: { id: 999999 },
          text: "/start",
        },
      },
    });

    // Mock fetch so it doesn't make real HTTP calls
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});

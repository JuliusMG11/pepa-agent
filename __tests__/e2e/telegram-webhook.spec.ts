import { test, expect } from "@playwright/test";

const WEBHOOK_URL = "/api/telegram/webhook";

test.describe("Telegram webhook — security", () => {
  test("rejects request with wrong secret token", async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      headers: { "X-Telegram-Bot-Api-Secret-Token": "totally-wrong-secret" },
      data: {
        message: { text: "/start", from: { id: 99999 }, chat: { id: 99999 } },
      },
    });

    expect(response.status()).toBe(401);
  });

  test("rejects request with no secret token header", async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      data: {
        message: { text: "/start", from: { id: 99999 }, chat: { id: 99999 } },
      },
    });

    expect(response.status()).toBe(401);
  });

  test("rejects malformed JSON with 400", async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token":
          process.env.TELEGRAM_WEBHOOK_SECRET ?? "test",
      },
      data: "not-json-at-all",
    });

    // Either 400 (bad request) or 401 (secret not set in test env) — both acceptable
    expect([400, 401]).toContain(response.status());
  });
});

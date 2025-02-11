import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { BrowserManager } from "./BrowserManager.js";
import { BrowserSession } from "./types.js";

describe("Browser Navigation Tests", () => {
  let browserManager: BrowserManager;
  let session: BrowserSession;
  const baseUrl = "https://the-internet.herokuapp.com";

  beforeAll(async () => {
    browserManager = new BrowserManager();
    session = await browserManager.createSession({ headless: true });
  });

  afterAll(async () => {
    await browserManager.closeAllSessions();
  });

  it("should navigate to main page and verify content", async () => {
    await session.page.goto(baseUrl);
    const title = await session.page.title();
    expect(title).toBe("The Internet");

    const headerText = await session.page.$eval(
      "h1.heading",
      (el) => el.textContent
    );
    expect(headerText).toBe("Welcome to the-internet");
  });

  it("should navigate to login page and verify title", async () => {
    await session.page.goto(`${baseUrl}/login`);
    const title = await session.page.title();
    expect(title).toBe("The Internet");

    const headerText = await session.page.$eval("h2", (el) => el.textContent);
    expect(headerText).toBe("Login Page");
  });

  it("should handle 404 pages appropriately", async () => {
    await session.page.goto(`${baseUrl}/nonexistent`);

    // Wait for the page to stabilize
    await session.page.waitForLoadState("networkidle");

    // Check for 404 content instead of title since title may vary
    const bodyText = await session.page.$eval("body", (el) => el.textContent);
    expect(bodyText).toContain("Not Found");
  });

  it("should handle navigation timeouts", async () => {
    await expect(
      session.page.goto(`${baseUrl}/slow`, { timeout: 1 })
    ).rejects.toThrow();
  });

  it("should wait for network idle", async () => {
    await session.page.goto(baseUrl, {
      waitUntil: "networkidle",
    });
    expect(session.page.url()).toBe(`${baseUrl}/`);
  });
});

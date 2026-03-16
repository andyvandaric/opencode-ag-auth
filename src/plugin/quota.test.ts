import { afterEach, describe, expect, it, vi } from "vitest";
import { GEMINI_CLI_HEADERS } from "../constants";
import { __testExports } from "./quota";

const { fetchAvailableModels, fetchGeminiCliQuota, resolveQuotaProjectId } =
  __testExports;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("quota request helpers", () => {
  it("falls back to the default project id for quota-only requests", () => {
    expect(resolveQuotaProjectId("")).toBe("rising-fact-p41fc");
    expect(resolveQuotaProjectId("project-123")).toBe("project-123");
  });

  it("sends antigravity quota requests with the fallback project and antigravity headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ models: {} }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchAvailableModels("token", "");

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const requestInit = init as RequestInit;
    const body = JSON.parse(String(requestInit.body));
    const headers = requestInit.headers as Record<string, string>;

    expect(body.project).toBe("rising-fact-p41fc");
    expect(headers["User-Agent"]).toMatch(/^Mozilla\/5\.0 .* Antigravity\//);
    expect(headers["X-Goog-Api-Client"]).toBeDefined();
    expect(headers["Client-Metadata"]).toContain('"ideType":"ANTIGRAVITY"');
  });

  it("sends gemini cli quota requests with the fallback project and gemini headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ buckets: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchGeminiCliQuota("token", "");

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const requestInit = init as RequestInit;
    const body = JSON.parse(String(requestInit.body));
    const headers = requestInit.headers as Record<string, string>;

    expect(body.project).toBe("rising-fact-p41fc");
    expect(headers["User-Agent"]).toBe(GEMINI_CLI_HEADERS["User-Agent"]);
    expect(headers["X-Goog-Api-Client"]).toBe(
      GEMINI_CLI_HEADERS["X-Goog-Api-Client"],
    );
    expect(headers["Client-Metadata"]).toBe(
      GEMINI_CLI_HEADERS["Client-Metadata"],
    );
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("development HTTP security boundary", () => {
  it("marks every development route family private and non-cacheable", async () => {
    const headers = await nextConfig.headers?.();
    const developmentRouteFamilies = [
      "/admin/desarrollo/:path*",
      "/admin/colaboradores/:employeeId/desarrollo/:path*",
      "/perfil/desarrollo/:path*",
    ];

    for (const source of developmentRouteFamilies) {
      const route = headers?.find((candidate) => candidate.source === source);

      expect(
        route?.headers,
        `${source} must explicitly disable caching`,
      ).toContainEqual({
        key: "Cache-Control",
        value: "private, no-store, max-age=0, must-revalidate",
      });
    }
  });

  it("keeps authenticated routes out of the service-worker precache", () => {
    const serviceWorker = readFileSync(resolve("public/sw.js"), "utf8");
    const precacheSource = serviceWorker.match(
      /const PRECACHE_URLS = \[(?<entries>[\s\S]*?)\];/,
    )?.groups?.entries;

    expect(precacheSource).toBeDefined();
    expect(precacheSource).not.toContain("/admin");
    expect(precacheSource).not.toContain("/desarrollo");
    expect(serviceWorker).toContain('if (request.mode === "navigate")');
    expect(serviceWorker).toContain("event.respondWith(fetch(request)");
  });
});

// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const origin = "https://pwa.example";
const source = readFileSync(resolve("public/sw.js"), "utf8");
type CacheKey = string | { url: string };
type WorkerEvent = {
  request: { url: string; method: string; mode: string };
  respondWith: (response: Promise<Response>) => void;
  waitUntil: (work: Promise<unknown>) => void;
};

function worker() {
  const entries = new Map<string, Response>();
  const key = (request: CacheKey) =>
    new URL(typeof request === "string" ? request : request.url, origin).href;
  const cache = {
    match: vi.fn(async (request: CacheKey) => entries.get(key(request))?.clone()),
    put: vi.fn(async (request: CacheKey, response: Response) => {
      entries.set(key(request), response.clone());
    }),
    addAll: vi.fn(async () => undefined),
  };
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => [
      "colaboradores-dna-v2",
      "colaboradores-dna-v3",
      "unrelated-cache",
    ]),
    delete: vi.fn(async () => true),
  };
  const fetch = vi.fn(async () => new Response("new asset"));
  const handlers = new Map<string, (event: WorkerEvent) => void>();
  const claim = vi.fn(async () => undefined);
  runInNewContext(source, {
    URL,
    Request,
    Response,
    caches,
    fetch,
    self: {
      location: { origin },
      clients: { claim },
      skipWaiting: vi.fn(),
      addEventListener: (type: string, handler: (event: WorkerEvent) => void) =>
        handlers.set(type, handler),
    },
  });
  function dispatch(path: string, mode = "cors", method = "GET", type = "fetch") {
    let response: Promise<Response> | undefined;
    const work: Promise<unknown>[] = [];
    handlers.get(type)!({
      request: { url: new URL(path, origin).href, mode, method },
      respondWith: (value) => {
        response = value;
      },
      waitUntil: (value) => {
        work.push(value);
      },
    });
    return { response, done: Promise.all(work) };
  }
  return { entries, cache, caches, fetch, claim, dispatch };
}

describe("PWA worker behavior", () => {
  it("serves cached artwork then revalidates it without a worker version change", async () => {
    const w = worker();
    w.entries.set(`${origin}/images/logo.svg`, new Response("old asset"));
    const result = w.dispatch("/images/logo.svg");
    expect(await (await result.response)?.text()).toBe("old asset");
    await result.done;
    expect(w.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: `${origin}/images/logo.svg` }),
      { cache: "no-cache" },
    );
    expect(await w.entries.get(`${origin}/images/logo.svg`)?.text()).toBe("new asset");
  });

  it("uses cached content-hashed chunks without requesting them again", async () => {
    const w = worker();
    w.entries.set(`${origin}/_next/static/chunks/hash.js`, new Response("chunk"));
    expect(
      await (await w.dispatch("/_next/static/chunks/hash.js").response)?.text(),
    ).toBe("chunk");
    expect(w.fetch).not.toHaveBeenCalled();
  });

  it("falls back offline and refreshes the fallback when connectivity returns", async () => {
    const w = worker();
    w.entries.set(`${origin}/offline.html`, new Response("offline"));
    w.fetch.mockRejectedValue(new TypeError("offline"));
    const offline = w.dispatch("/ausencias", "navigate");
    expect(await (await offline.response)?.text()).toBe("offline");
    await offline.done;
    w.fetch.mockImplementation(async () => new Response("online"));
    const online = w.dispatch("/ausencias", "navigate");
    expect(await (await online.response)?.text()).toBe("online");
    await online.done;
    expect(await w.entries.get(`${origin}/offline.html`)?.text()).toBe("online");
    expect(w.entries.has(`${origin}/ausencias`)).toBe(false);
  });

  it("does not intercept mutations, private API/RSC requests or another origin", () => {
    const w = worker();
    expect(w.dispatch("/api/planning/v1/workspace").response).toBeUndefined();
    expect(w.dispatch("/ausencias?_rsc=example").response).toBeUndefined();
    expect(w.dispatch("/ausencias", "cors", "POST").response).toBeUndefined();
    expect(
      w.dispatch("https://another.example/images/logo.png").response,
    ).toBeUndefined();
    expect(w.fetch).not.toHaveBeenCalled();
  });

  it("removes only older app caches before claiming clients", async () => {
    const w = worker();
    await w.dispatch("/", "cors", "GET", "activate").done;
    expect(w.caches.delete).toHaveBeenCalledExactlyOnceWith("colaboradores-dna-v2");
    expect(w.claim).toHaveBeenCalledOnce();
  });

  it("returns a network response even if writing the asset cache fails", async () => {
    const w = worker();
    w.cache.put.mockRejectedValue(new Error("Quota exceeded"));
    const result = w.dispatch("/icons/icon-192.png");
    expect(await (await result.response)?.text()).toBe("new asset");
    await result.done;
  });
});

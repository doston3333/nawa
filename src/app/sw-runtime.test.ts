import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

type CacheMap = Map<string, Response>;

function loadWorker(options: { fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> } = {}) {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const cacheMaps = new Map<string, CacheMap>();
  const cachePutCalls: string[] = [];
  const cacheMatchCalls: string[] = [];
  const deletedCaches: string[] = [];
  const fetchImpl = options.fetch ?? (async () => new Response("ok", { status: 200 }));
  const keyFor = (request: RequestInfo | URL) =>
    request instanceof Request ? request.url : new URL(request.toString(), "https://nawa.test").href;

  const cacheApi = {
    open: async (name: string) => {
      const records = cacheMaps.get(name) ?? new Map<string, Response>();
      cacheMaps.set(name, records);
      return {
        put: async (request: RequestInfo | URL, response: Response) => {
          const key = keyFor(request);
          cachePutCalls.push(typeof request === "string" ? request : key);
          records.set(key, response);
        },
      };
    },
    keys: async () => [...cacheMaps.keys()],
    delete: async (name: string) => {
      deletedCaches.push(name);
      return cacheMaps.delete(name);
    },
    match: async (request: RequestInfo | URL) => {
      const key = keyFor(request);
      cacheMatchCalls.push(key);
      for (const records of cacheMaps.values()) {
        const response = records.get(key);
        if (response) return response.clone();
      }
      return undefined;
    },
  };

  const self = {
    location: { origin: "https://nawa.test" },
    addEventListener: (type: string, listener: (event: Record<string, unknown>) => void) => {
      listeners.set(type, listener);
    },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  };

  const context = vm.createContext({
    self,
    caches: cacheApi,
    fetch: fetchImpl,
    URL,
    Request,
    Response,
    Promise,
    console,
  });
  vm.runInContext(readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8"), context);

  const dispatch = async (type: string, event: { request?: Request } = {}) => {
    let responsePromise: Promise<Response> | undefined;
    const waits: Promise<unknown>[] = [];
    const listener = listeners.get(type);
    if (!listener) throw new Error(`No ${type} listener registered`);
    listener({
      ...event,
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
      respondWith: (promise: Promise<Response>) => {
        responsePromise = promise;
      },
    });
    await Promise.all(waits);
    return responsePromise ? await responsePromise : undefined;
  };

  return { cacheApi, cacheMaps, cachePutCalls, cacheMatchCalls, deletedCaches, dispatch };
}

describe("service-worker runtime", () => {
  it("precaches only public shell assets and skips redirects", async () => {
    const requested: string[] = [];
    const worker = loadWorker({
      fetch: async (input) => {
        const path = new URL(input.toString(), "https://nawa.test").pathname;
        requested.push(path);
        if (path === "/profiles") {
          return Response.redirect("https://nawa.test/choose", 302);
        }
        return new Response(path, { status: 200 });
      },
    });

    await worker.dispatch("install");

    expect(requested).toEqual(["/", "/profiles", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"]);
    expect(worker.cachePutCalls).toEqual(["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"]);
    expect(worker.cachePutCalls).not.toContain("/profiles");
    expect(worker.cachePutCalls).not.toContain("/learn");
    expect(worker.cachePutCalls).not.toContain("/study");
  });

  it("fails install on a fetch failure so an empty shell is not activated", async () => {
    const worker = loadWorker({ fetch: async () => { throw new Error("offline"); } });
    await expect(worker.dispatch("install")).rejects.toThrow("offline");
    expect(worker.cachePutCalls).toEqual([]);
  });

  it("deletes old shell caches on activation", async () => {
    const worker = loadWorker();
    await worker.cacheApi.open("nawa-shell-v1");
    await worker.cacheApi.open("nawa-shell-v2");
    await worker.cacheApi.open("unrelated-cache");

    await worker.dispatch("activate");

    expect(worker.deletedCaches).toEqual(["nawa-shell-v1"]);
    expect(worker.cacheMaps.has("nawa-shell-v1")).toBe(false);
    expect(worker.cacheMaps.has("unrelated-cache")).toBe(true);
  });

  it("uses cache-first for successful same-origin static GETs", async () => {
    let fetchCount = 0;
    const worker = loadWorker({
      fetch: async () => {
        fetchCount += 1;
        return new Response("static", { status: 200 });
      },
    });
    const request = new Request("https://nawa.test/manifest.webmanifest");

    expect(await (await worker.dispatch("fetch", { request }))?.text()).toBe("static");
    expect(await (await worker.dispatch("fetch", { request }))?.text()).toBe("static");
    expect(fetchCount).toBe(1);
  });

  it("does not cache profile APIs and returns a safe offline fallback", async () => {
    let online = true;
    const worker = loadWorker({
      fetch: async () => {
        if (!online) throw new Error("offline");
        return new Response(JSON.stringify({ profile: "private" }), { status: 200 });
      },
    });
    const request = new Request("https://nawa.test/api/learn/path");

    expect(await (await worker.dispatch("fetch", { request }))?.status).toBe(200);
    expect(worker.cachePutCalls).toEqual([]);
    expect(worker.cacheMatchCalls).toEqual([]);
    online = false;
    const offline = await worker.dispatch("fetch", { request });
    expect(offline?.status).toBe(503);
    expect(await offline?.text()).toBe("Offline");
  });

  it("does not intercept mutations", async () => {
    const worker = loadWorker();
    const request = new Request("https://nawa.test/api/sync/push", { method: "POST", body: "{}" });
    expect(await worker.dispatch("fetch", { request })).toBeUndefined();
    expect(worker.cachePutCalls).toEqual([]);
    expect(worker.cacheMatchCalls).toEqual([]);
  });
});

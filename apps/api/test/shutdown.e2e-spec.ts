import { setTimeout as sleep } from "node:timers/promises";
import { Controller, Get } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadinessService } from "../src/health/readiness.service.js";
import { ShutdownService } from "../src/shutdown/shutdown.service.js";
import { createTestApp, type TestApp } from "./support/test-app.js";

@Controller("slow")
class SlowController {
  @Get()
  async slow(): Promise<{ done: boolean }> {
    await sleep(300);
    return { done: true };
  }
}

@Controller("hang")
class HangController {
  @Get()
  hang(): Promise<never> {
    return new Promise(() => undefined);
  }
}

async function listen(t: TestApp): Promise<string> {
  await t.app.listen(0, "127.0.0.1");
  return t.app.getUrl();
}

describe("graceful shutdown (e2e)", () => {
  let t: TestApp | undefined;

  afterEach(() => {
    t = undefined;
  });

  it("finishes in-flight requests, refuses new ones, then closes the pool", async () => {
    t = await createTestApp({ controllers: [SlowController] });
    const url = await listen(t);

    const inFlight = fetch(`${url}/slow`);
    await sleep(50); // the request is now being handled
    const closing = t.app.close(); // the same sequence a SIGTERM runs

    // close() runs a few hooks before beforeApplicationShutdown flips the flag.
    const shutdown = t.app.get(ShutdownService);
    await vi.waitFor(() => {
      expect(shutdown.isShuttingDown).toBe(true);
    });
    await expect(t.app.get(ReadinessService).check()).resolves.toEqual({
      status: "shutting_down",
      checks: {},
    });
    const response = await inFlight;
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ done: true });

    await closing;
    expect(t.pool.end).toHaveBeenCalledTimes(1);
    await expect(fetch(`${url}/health`)).rejects.toThrow();
    expect(t.exit).not.toHaveBeenCalled();
    expect(t.logs().map((entry) => entry.msg)).toEqual(
      expect.arrayContaining(["shutdown started", "shutdown complete"]),
    );
  });

  it("exits 1 and names what's still open when the timeout passes", async () => {
    t = await createTestApp({
      controllers: [HangController],
      env: { SHUTDOWN_TIMEOUT_MS: "1000" },
    });
    const url = await listen(t);

    const abort = new AbortController();
    const hanging = fetch(`${url}/hang`, { signal: abort.signal }).catch(() => undefined);
    await sleep(50);
    const closing = t.app.close();

    await vi.waitFor(
      () => {
        expect(t?.exit).toHaveBeenCalledWith(1);
      },
      { timeout: 2_000, interval: 50 },
    );
    expect(t.logs()).toContainEqual(
      expect.objectContaining({
        level: "fatal",
        msg: "shutdown timed out",
        pending: ["http-server", "mysql-pool"],
      }),
    );

    abort.abort(); // let the test clean up
    await hanging;
    await closing;
  });

  it("still completes when the pool fails to close, and logs why", async () => {
    t = await createTestApp();
    t.pool.end.mockRejectedValueOnce(
      Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" }),
    );
    await listen(t);

    await t.app.close();

    expect(t.exit).not.toHaveBeenCalled();
    expect(t.logs()).toContainEqual(
      expect.objectContaining({ level: "warn", msg: "mysql pool did not close cleanly" }),
    );
    expect(t.logs().map((entry) => entry.msg)).toContain("shutdown complete");
  });
});

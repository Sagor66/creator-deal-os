import type { Server } from "node:http";
import {
  Inject,
  Injectable,
  type BeforeApplicationShutdown,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ENV, type Env } from "../config/env.js";
import { LOGGER, type AppLogger } from "../logging/logger.js";

/** DI token for the exit function, so tests can observe a forced exit without dying. */
export const EXIT = Symbol("EXIT");
export type ExitFn = (code: number) => void;

const HTTP_SERVER = "http-server";

/**
 * Coordinates graceful shutdown. Nest's order (verified in @nestjs/core 12.1.2):
 * beforeApplicationShutdown → HTTP server close (drains in-flight) → onApplicationShutdown.
 */
@Injectable()
export class ShutdownService implements BeforeApplicationShutdown, OnApplicationShutdown {
  private shuttingDown = false;
  private readonly resources = new Map<string, boolean>([[HTTP_SERVER, false]]);
  private forceExitTimer: NodeJS.Timeout | undefined;
  private idleSweep: NodeJS.Timeout | undefined;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(LOGGER) private readonly logger: AppLogger,
    @Inject(EXIT) private readonly exit: ExitFn,
    private readonly adapterHost: HttpAdapterHost,
  ) {}

  get isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  /** A resource that must close before shutdown counts as complete. */
  register(name: string): void {
    this.resources.set(name, false);
  }

  markClosed(name: string): void {
    this.resources.set(name, true);
    if (this.shuttingDown && this.pending().length === 0) {
      clearTimeout(this.forceExitTimer);
      this.logger.info("shutdown complete");
    }
  }

  pending(): string[] {
    return [...this.resources].filter(([, closed]) => !closed).map(([name]) => name);
  }

  beforeApplicationShutdown(signal?: string): void {
    this.shuttingDown = true; // readiness answers 503 from now on
    const timeoutMs = this.env.SHUTDOWN_TIMEOUT_MS;
    this.logger.info({ signal, timeoutMs }, "shutdown started");

    this.forceExitTimer = setTimeout(() => {
      this.logger.fatal({ pending: this.pending(), timeoutMs }, "shutdown timed out");
      this.exit(1);
    }, timeoutMs);
    this.forceExitTimer.unref();

    // server.close() only drops sockets idle *now*; keep dropping the ones that
    // go idle as their in-flight response finishes.
    const server = this.adapterHost.httpAdapter.getHttpServer() as Server | undefined;
    if (server) {
      this.idleSweep = setInterval(() => {
        server.closeIdleConnections();
      }, 100);
      this.idleSweep.unref();
    }
  }

  /** Runs after Nest has closed the HTTP server and every in-flight request finished. */
  onApplicationShutdown(): void {
    clearInterval(this.idleSweep);
    this.markClosed(HTTP_SERVER);
  }
}

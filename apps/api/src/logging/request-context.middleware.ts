import { randomUUID } from "node:crypto";
import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { ShutdownService } from "../shutdown/shutdown.service.js";
import { LOGGER, type AppLogger } from "./logger.js";
import { requestContext } from "./request-context.js";

/** Accept well-formed IDs from upstream (load balancer, web app); anything else is replaced. */
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

export function resolveRequestId(incoming: string | string[] | undefined): string {
  return typeof incoming === "string" && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
}

/** The route template ("/health/ready", later "/deals/:id"): never the raw URL or query. */
function routeOf(request: Request): string {
  const route: unknown = request.route;
  if (typeof route === "object" && route !== null && "path" in route) {
    const path = route.path;
    if (typeof path === "string") return `${request.baseUrl}${path}`;
  }
  return "(unmatched)";
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(
    @Inject(LOGGER) private readonly logger: AppLogger,
    private readonly shutdown: ShutdownService,
  ) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = resolveRequestId(request.headers["x-request-id"]);
    const startedAt = performance.now();
    response.setHeader("X-Request-Id", requestId);
    // A request arriving on a kept-alive socket during shutdown closes that socket afterwards.
    if (this.shutdown.isShuttingDown) response.setHeader("Connection", "close");

    response.on("finish", () => {
      const route = routeOf(request);
      const fields = {
        method: request.method,
        route,
        status: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      };
      requestContext.run({ requestId }, () => {
        if (route.startsWith("/health")) this.logger.debug(fields, "request completed");
        else if (response.statusCode >= 500) this.logger.error(fields, "request completed");
        else this.logger.info(fields, "request completed");
      });
    });

    requestContext.run({ requestId }, next);
  }
}

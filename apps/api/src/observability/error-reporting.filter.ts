import { Catch, HttpException, type ArgumentsHost } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import * as Sentry from "@sentry/node";
import type { Request } from "express";
import { requestContext } from "../logging/request-context.js";
import { FLUSH_TIMEOUT_MS } from "./sentry.js";

/**
 * Only unexpected failures are worth a human's attention: anything that isn't
 * an HttpException, or one that is a 5xx. A 4xx is the client's mistake and
 * normal control flow, so reporting it would only teach us to ignore alerts.
 */
export function shouldReport(exception: unknown): boolean {
  return !(exception instanceof HttpException) || exception.getStatus() >= 500;
}

/**
 * Global filter: report unexpected errors to Sentry, wait for delivery, then let
 * Nest's default filter build the response (and log it) as before.
 */
@Catch()
export class ErrorReportingFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    // Respond only after the report is delivered: once the response is sent,
    // Cloud Run may starve this instance of CPU. flush() never rejects.
    void this.report(exception, host).finally(() => {
      super.catch(exception, host);
    });
  }

  private async report(exception: unknown, host: ArgumentsHost): Promise<void> {
    if (host.getType() !== "http" || !shouldReport(exception)) return;
    const request = host.switchToHttp().getRequest<Request>();
    const route = (request.route as { path?: string } | undefined)?.path ?? "unmatched";
    Sentry.withScope((scope) => {
      scope.setTag("route", `${request.method} ${route}`);
      const requestId = requestContext.current()?.requestId;
      if (requestId !== undefined) scope.setTag("request_id", requestId);
      // Explicit and minimal: method and path, never the query string, headers or body.
      scope.setContext("http", { method: request.method, path: request.path });
      Sentry.captureException(exception);
    });
    await Sentry.flush(FLUSH_TIMEOUT_MS);
  }
}

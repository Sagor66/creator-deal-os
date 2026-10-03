import type { LoggerService } from "@nestjs/common";
import type { AppLogger } from "./logger.js";

type Level = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

/**
 * Routes Nest's own logs (bootstrap, route mapping, unhandled exceptions)
 * through pino, so the whole process speaks one JSON format.
 */
export class PinoNestLogger implements LoggerService {
  constructor(private readonly logger: AppLogger) {}

  log(message: unknown, ...rest: unknown[]): void {
    this.write("info", message, rest);
  }
  error(message: unknown, ...rest: unknown[]): void {
    this.write("error", message, rest);
  }
  warn(message: unknown, ...rest: unknown[]): void {
    this.write("warn", message, rest);
  }
  debug(message: unknown, ...rest: unknown[]): void {
    this.write("debug", message, rest);
  }
  verbose(message: unknown, ...rest: unknown[]): void {
    this.write("trace", message, rest);
  }
  fatal(message: unknown, ...rest: unknown[]): void {
    this.write("fatal", message, rest);
  }

  /**
   * Nest calls (message), (message, context), or for errors (message, stack) and
   * (message, stack, context). A lone extra string is a stack if it looks like one.
   */
  private write(level: Level, message: unknown, rest: unknown[]): void {
    const strings = rest.filter((value): value is string => typeof value === "string");
    const looksLikeStack = (value: string | undefined) => value?.includes("\n    at ") ?? false;
    const stack = strings.length >= 2 || looksLikeStack(strings[0]) ? strings[0] : undefined;
    const last = strings.at(-1);
    const context = last !== undefined && last !== stack ? last : undefined;

    if (message instanceof Error) {
      this.logger[level]({ context, err: message }, message.message);
    } else if (stack !== undefined) {
      this.logger[level]({ context, err: { message: String(message), stack } }, String(message));
    } else if (typeof message === "object" && message !== null) {
      this.logger[level]({ context, ...message });
    } else {
      this.logger[level]({ context }, String(message));
    }
  }
}

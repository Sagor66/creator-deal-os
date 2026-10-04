import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";
import { EnvValidationError, loadEnv, type Env } from "./config/env.js";
import { createLogger } from "./logging/logger.js";
import { PinoNestLogger } from "./logging/nest-logger.js";

function loadEnvOrExit(): Env {
  try {
    return loadEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      // Before the logger exists: plain text on stderr, then stop. Values are never printed.
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

const env = loadEnvOrExit();
const logger = createLogger(env);

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled promise rejection");
});
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "uncaught exception");
  process.exit(1);
});

const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot({ env, logger }), {
  bufferLogs: true,
});
app.useLogger(new PinoNestLogger(logger));
if (env.TRUST_PROXY) app.set("trust proxy", 1);
// useProcessExit: exit 0 after a clean shutdown instead of re-raising the signal (exit 143).
app.enableShutdownHooks(["SIGTERM", "SIGINT"], { useProcessExit: true });

await app.listen(env.PORT);
logger.info({ port: env.PORT, env: env.NODE_ENV }, "api listening");

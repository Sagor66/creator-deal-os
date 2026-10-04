import {
  Module,
  type DynamicModule,
  type MiddlewareConsumer,
  type NestModule,
} from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ENV, type Env } from "./config/env.js";
import { DatabaseModule } from "./database/database.module.js";
import { HEALTH_INDICATORS, type HealthIndicator } from "./health/health-indicator.js";
import { HealthController } from "./health/health.controller.js";
import { MysqlHealthIndicator } from "./health/mysql.health.js";
import { ReadinessService } from "./health/readiness.service.js";
import { LOGGER, type AppLogger } from "./logging/logger.js";
import { RequestContextMiddleware } from "./logging/request-context.middleware.js";
import { MetaController } from "./meta/meta.controller.js";
import { ErrorReportingFilter } from "./observability/error-reporting.filter.js";
import { EXIT, ShutdownService, type ExitFn } from "./shutdown/shutdown.service.js";

export interface AppModuleOptions {
  env: Env;
  logger: AppLogger;
}

const exitProcess: ExitFn = (code) => process.exit(code);

@Module({})
export class AppModule implements NestModule {
  /** Takes the validated env and the process logger, so tests can boot with their own. */
  static forRoot({ env, logger }: AppModuleOptions): DynamicModule {
    return {
      module: AppModule,
      global: true,
      imports: [DatabaseModule],
      controllers: [MetaController, HealthController],
      providers: [
        { provide: ENV, useValue: env },
        { provide: LOGGER, useValue: logger },
        { provide: EXIT, useValue: exitProcess },
        ShutdownService,
        // Reports unexpected errors to Sentry (a no-op without a DSN), then responds as Nest would.
        { provide: APP_FILTER, useClass: ErrorReportingFilter },
        ReadinessService,
        MysqlHealthIndicator,
        {
          provide: HEALTH_INDICATORS,
          inject: [MysqlHealthIndicator],
          useFactory: (...indicators: HealthIndicator[]) => indicators,
        },
      ],
      exports: [ENV, LOGGER, ShutdownService],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}

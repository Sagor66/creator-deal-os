import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from "@nestjs/common";
import { createPool, type Pool } from "mysql2/promise";
import { ENV, type Env } from "../config/env.js";
import { LOGGER, type AppLogger } from "../logging/logger.js";
import { ShutdownService } from "../shutdown/shutdown.service.js";
import { buildConnectionOptions } from "./connection-options.js";

/** DI token for the shared mysql2 pool. Drizzle will wrap this same pool (ADR-002). */
export const MYSQL_POOL = Symbol("MYSQL_POOL");

const POOL_RESOURCE = "mysql-pool";

@Injectable()
class PoolLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(MYSQL_POOL) private readonly pool: Pool,
    @Inject(LOGGER) private readonly logger: AppLogger,
    private readonly shutdown: ShutdownService,
  ) {
    shutdown.register(POOL_RESOURCE);
  }

  /**
   * After the HTTP server has drained, so no in-flight request loses its connection.
   * A failed close is logged, not thrown: the process is exiting either way, and a
   * close that hangs is caught by the shutdown timeout instead.
   */
  async onApplicationShutdown(): Promise<void> {
    try {
      await this.pool.end();
      this.logger.debug("mysql pool closed");
    } catch (error) {
      this.logger.warn({ err: error }, "mysql pool did not close cleanly");
    } finally {
      this.shutdown.markClosed(POOL_RESOURCE);
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: MYSQL_POOL,
      inject: [ENV],
      // Lazy: no connection is opened until the first query, so the API starts
      // (live, not ready) even while MySQL is down.
      useFactory: (env: Env): Pool =>
        createPool({ ...buildConnectionOptions(env), connectionLimit: 10 }),
    },
    PoolLifecycle,
  ],
  exports: [MYSQL_POOL],
})
export class DatabaseModule {}

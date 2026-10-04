import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "mysql2/promise";
import { MYSQL_POOL } from "../database/database.module.js";
import { CHECK_TIMEOUT_MS, type HealthIndicator } from "./health-indicator.js";

@Injectable()
export class MysqlHealthIndicator implements HealthIndicator {
  readonly name = "mysql";

  constructor(@Inject(MYSQL_POOL) private readonly pool: Pool) {}

  async check(): Promise<void> {
    await this.pool.query({ sql: "SELECT 1", timeout: CHECK_TIMEOUT_MS });
  }
}

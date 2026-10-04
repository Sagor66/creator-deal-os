import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkMigrationsFolder, findUnacknowledgedDestructive } from "./migration-safety.js";

const rulesOf = (sql: string) =>
  findUnacknowledgedDestructive("0001_test.sql", sql).map((f) => f.rule);

describe("findUnacknowledgedDestructive", () => {
  it.each([
    ["DROP TABLE `deals`;", "drops a table, view or database"],
    ["DROP TEMPORARY TABLE tmp;", "drops a table, view or database"],
    ["DROP VIEW v;", "drops a table, view or database"],
    ["TRUNCATE TABLE `deals`;", "truncates a table"],
    ["DELETE FROM `deals` WHERE `id` = 1;", "deletes rows"],
    ["ALTER TABLE `deals` DROP COLUMN `fee`;", "drops a column"],
    ["ALTER TABLE `deals` DROP `fee`;", "drops a column"],
    ["ALTER TABLE `deals` DROP INDEX `a`, DROP COLUMN `fee`;", "drops a column"],
    ["RENAME TABLE `deals` TO `old_deals`;", "renames a table or column"],
    ["ALTER TABLE `deals` RENAME COLUMN `fee` TO `amount`;", "renames a table or column"],
    ["ALTER TABLE `deals` MODIFY COLUMN `fee` int NOT NULL;", "changes a column's definition"],
    ["ALTER TABLE `deals` CHANGE `fee` `amount` int;", "changes a column's definition"],
  ])("flags %s", (sql, rule) => {
    expect(rulesOf(sql)).toContain(rule);
  });

  it.each([
    "CREATE TABLE `deals` (`id` serial PRIMARY KEY);",
    "ALTER TABLE `deals` ADD `fee_minor` bigint;",
    "CREATE INDEX `deals_ws_idx` ON `deals` (`workspace_id`);",
    "ALTER TABLE `deals` DROP INDEX `deals_ws_idx`;",
    "ALTER TABLE `deals` DROP FOREIGN KEY `deals_brand_fk`;",
    "ALTER TABLE `deals` ALTER COLUMN `stage` DROP DEFAULT;",
    "ALTER TABLE `deals` RENAME INDEX `a` TO `b`;",
    "UPDATE `deals` SET `fee_minor` = `fee` * 100;",
  ])("allows %s", (sql) => {
    expect(rulesOf(sql)).toEqual([]);
  });

  it("does not mistake a foreign key's ON DELETE for deleting rows", () => {
    const sql =
      "ALTER TABLE `deals` ADD CONSTRAINT `fk` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;";
    expect(rulesOf(sql)).toEqual([]);
  });

  it("ignores keywords inside comments, strings and quoted identifiers", () => {
    const sql = [
      "-- we used to DROP TABLE here",
      "/* TRUNCATE nothing */",
      "INSERT INTO `notes` (`body`) VALUES ('please DELETE FROM my list');",
      "ALTER TABLE `deals` ADD `rename` varchar(10);",
    ].join("\n");
    expect(rulesOf(sql)).toEqual([]);
  });

  it("isn't fooled by comment markers inside a string", () => {
    const sql = "INSERT INTO `notes` (`body`) VALUES ('a -- b'); DROP TABLE `deals`;";
    expect(rulesOf(sql)).toContain("drops a table, view or database");
  });

  it("quotes the statement, names included, in the finding", () => {
    expect(findUnacknowledgedDestructive("0001_x.sql", "-- why\nDROP TABLE `deals`;")).toEqual([
      expect.objectContaining({ excerpt: "DROP TABLE `deals`;" }),
    ]);
  });

  it("accepts a destructive statement acknowledged in its own chunk", () => {
    const sql = [
      "ALTER TABLE `deals` ADD `fee_minor` bigint;",
      "--> statement-breakpoint",
      "-- allow-destructive: contract step of the fee → fee_minor move, released after #42",
      "ALTER TABLE `deals` DROP COLUMN `fee`;",
    ].join("\n");
    expect(rulesOf(sql)).toEqual([]);
  });

  it("does not let one acknowledgement cover the next statement", () => {
    const sql = [
      "-- allow-destructive: contract step of the fee → fee_minor move",
      "ALTER TABLE `deals` DROP COLUMN `fee`;",
      "--> statement-breakpoint",
      "DROP TABLE `old_deals`;",
    ].join("\n");
    expect(findUnacknowledgedDestructive("0002_x.sql", sql)).toEqual([
      expect.objectContaining({ statement: 2, rule: "drops a table, view or database" }),
    ]);
  });

  it("rejects a reason too short to have been thought about", () => {
    const sql = "-- allow-destructive: ok\nDROP TABLE `deals`;";
    expect(rulesOf(sql)).toContain("drops a table, view or database");
  });
});

describe("checkMigrationsFolder", () => {
  it("finds nothing unacknowledged in the real migrations folder", async () => {
    const folder = fileURLToPath(new URL("../../drizzle", import.meta.url));
    await expect(checkMigrationsFolder(folder)).resolves.toEqual([]);
  });
});

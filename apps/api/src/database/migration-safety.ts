import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * "Never destructive by default" (docs/design/deployment.md §3).
 *
 * A statement that can lose data, or break the version still serving traffic
 * during a deploy, must carry `-- allow-destructive: <reason>` in its own
 * statement chunk. The check runs in a unit test over the real migrations
 * folder (fails the PR) and again in the migration job (refuses to deploy).
 */

export interface DestructiveFinding {
  file: string;
  /** 1-based position of the statement chunk within the file. */
  statement: number;
  rule: string;
  excerpt: string;
}

const RULES: readonly { rule: string; pattern: RegExp }[] = [
  {
    rule: "drops a table, view or database",
    pattern: /\bDROP\s+(?:TEMPORARY\s+)?(?:TABLE|VIEW|DATABASE|SCHEMA)\b/i,
  },
  { rule: "truncates a table", pattern: /\bTRUNCATE\b/i },
  { rule: "deletes rows", pattern: /\bDELETE\b/i },
  {
    // MySQL accepts `DROP col` without the COLUMN keyword; indexes and constraints lose no data.
    rule: "drops a column",
    pattern:
      /\bALTER\s+TABLE\b[\s\S]*?\bDROP\s+(?!INDEX\b|KEY\b|FOREIGN\s+KEY\b|PRIMARY\s+KEY\b|CHECK\b|CONSTRAINT\b|DEFAULT\b)/i,
  },
  { rule: "renames a table or column", pattern: /\bRENAME\s+(?!INDEX\b|KEY\b)/i },
  {
    rule: "changes a column's definition",
    pattern: /\bALTER\s+TABLE\b[\s\S]*?\b(?:MODIFY|CHANGE)\b/i,
  },
];

/** drizzle-kit separates statements with this marker. */
const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

/** At least 10 characters of reason, so "ok" doesn't count as a review. */
const ACKNOWLEDGEMENT = /^\s*--\s*allow-destructive:\s*\S.{9,}$/im;

/**
 * One pass over the SQL, aware of quotes and comments (a regex chain isn't: a
 * `--` inside a string would swallow the rest of the line).
 * - `text`: comments removed, everything else kept (for readable excerpts).
 * - `code`: also blanks string literals and quoted identifiers, so only SQL
 *   keywords are left for the rules to match.
 */
function scan(sql: string): { text: string; code: string } {
  let text = "";
  let code = "";
  let i = 0;
  while (i < sql.length) {
    const char = sql.charAt(i);
    const next = sql.charAt(i + 1);
    if ((char === "-" && next === "-") || char === "#") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end;
      text += " ";
      code += " ";
    } else if (char === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      text += " ";
      code += " ";
    } else if (char === "'" || char === '"' || char === "`") {
      // Quoted until the matching quote; doubled quotes and backslash escapes stay inside.
      let j = i + 1;
      while (j < sql.length) {
        if (sql.charAt(j) === "\\" && char !== "`") j += 2;
        else if (sql.charAt(j) === char && sql.charAt(j + 1) === char) j += 2;
        else if (sql.charAt(j) === char) break;
        else j += 1;
      }
      text += sql.slice(i, j + 1);
      code += `${char}${char}`;
      i = j + 1;
    } else {
      text += char;
      code += char;
      i += 1;
    }
  }
  return { text, code: code.replace(/\bON\s+(?:DELETE|UPDATE)\b/gi, " ") };
}

export function findUnacknowledgedDestructive(file: string, sql: string): DestructiveFinding[] {
  const findings: DestructiveFinding[] = [];
  sql.split(STATEMENT_BREAKPOINT).forEach((chunk, index) => {
    if (ACKNOWLEDGEMENT.test(chunk)) return;
    const { text, code } = scan(chunk);
    for (const { rule, pattern } of RULES) {
      if (pattern.test(code)) {
        findings.push({
          file,
          statement: index + 1,
          rule,
          excerpt: text.replace(/\s+/g, " ").trim().slice(0, 120),
        });
      }
    }
  });
  return findings;
}

/** Every `.sql` file in the folder, in name order (drizzle-kit names them 0000_, 0001_, ...). */
export async function checkMigrationsFolder(folder: string): Promise<DestructiveFinding[]> {
  const files = (await readdir(folder)).filter((name) => name.endsWith(".sql")).sort();
  const findings = await Promise.all(
    files.map(async (name) =>
      findUnacknowledgedDestructive(name, await readFile(join(folder, name), "utf8")),
    ),
  );
  return findings.flat();
}

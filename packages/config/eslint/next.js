import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { baseConfig } from "./base.js";

/**
 * The Next.js web app: base rules plus Next's own and the React hooks rules.
 *
 * @param {{ tsconfigRootDir: string }} options
 */
export function nextConfig(options) {
  return defineConfig(
    baseConfig(options),
    globalIgnores(["out/**", "build/**"]),
    { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
    {
      plugins: { "@next/next": nextPlugin },
      // Tell Next's rules where the app lives, so they work when ESLint runs from the repo root (lint-staged).
      settings: { next: { rootDir: options.tsconfigRootDir } },
      rules: {
        ...nextPlugin.configs.recommended.rules,
        ...nextPlugin.configs["core-web-vitals"].rules,
      },
    },
    reactHooks.configs.flat.recommended,
  );
}

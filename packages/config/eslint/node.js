import { defineConfig } from "eslint/config";
import globals from "globals";
import { baseConfig } from "./base.js";

/**
 * Node workspaces: the NestJS API and compiled packages.
 *
 * @param {{ tsconfigRootDir: string }} options
 */
export function nodeConfig(options) {
  return defineConfig(baseConfig(options), {
    languageOptions: { globals: globals.node },
    rules: {
      // Nest modules are empty classes carrying a decorator; that's the framework's design.
      "@typescript-eslint/no-extraneous-class": ["error", { allowWithDecorator: true }],
    },
  });
}

import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

/**
 * Shared rules for every workspace: ESLint recommended plus typescript-eslint's
 * strictest type-aware presets. Type-aware rules need the consumer's own
 * directory, hence a factory rather than a static array.
 *
 * @param {{ tsconfigRootDir: string }} options
 */
export function baseConfig({ tsconfigRootDir }) {
  return defineConfig(
    globalIgnores([
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/next-env.d.ts",
    ]),
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
    },
    {
      // Config is read once, validated, in the env module; everything else gets it typed (issue #7).
      rules: {
        "no-restricted-properties": [
          "error",
          {
            object: "process",
            property: "env",
            message: "Read config from the validated env module (src/config/env.ts or src/env.ts).",
          },
        ],
      },
    },
    {
      files: ["**/src/config/env.ts", "**/src/env.ts", "**/*.config.{js,mjs,cjs,ts}"],
      rules: { "no-restricted-properties": "off" },
    },
    {
      // Config files are plain JS outside every tsconfig; lint them without types.
      files: ["**/*.{js,mjs,cjs}"],
      extends: [tseslint.configs.disableTypeChecked],
    },
    // Last, so it switches off any rule that would fight Prettier's formatting.
    prettier,
  );
}

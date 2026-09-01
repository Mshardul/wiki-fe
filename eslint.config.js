import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".venv/**",
      ".pytest_cache/**",
      "js/**",
      "css/**",
      "content/**",
      "data/**",
      "icons/**",
      "out/**",
      ".next/**",
      "scripts/**",
      "tests/e2e/**",
      "coverage/**",
      "*.min.js",
      "wiki-sw.js",
      "eslint.config.js",
      "*.config.js",
    ],
  },
  js.configs.recommended,
  {
    files: ["lib/**/*.ts", "tests/**/*.ts", "app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "no-console": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.tsx", "components/**/*.ts", "app/**/*.ts"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      "@next/next": nextPlugin,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
    },
    settings: { react: { version: "detect" } },
  },
  prettier,
);

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist", "node_modules"],
  },
  {
    files: ["backend/**/*.js", "backend/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-empty": "off",
    },
  },
  {
    files: ["scr/**/*.{ts,tsx}", "vite.config.ts", "fronted/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-empty": "off",
      "no-case-declarations": "off",
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    rules: {
      ...config.rules,
      "@typescript-eslint/no-explicit-any": "off",
    },
  })),
  prettier,
);
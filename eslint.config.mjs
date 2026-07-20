import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This project does not use the React Compiler.
      'react-compiler/react-compiler': 'off',
      // Calling setState inside useEffect is a valid pattern here (reading URL
      // params on mount, deriving display state from props, etc.).
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Workbox runtime (bundled by next-pwa, not hand-written):
    "public/workbox-*.js",
    "public/sw.js",
    "public/worker-*.js",
    "public/fallback-*.js",
    "documents/**",
  ]),
]);

export default eslintConfig;

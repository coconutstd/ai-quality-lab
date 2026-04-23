import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "storybook-static/**",
  ]),
  {
    rules: {
      // 순환 복잡도 10 초과 시 경고 — SRP 신호
      "complexity": ["warn", { max: 10 }],
      // 200줄 초과 시 경고 — 컴포넌트 비대화 신호
      "max-lines": ["warn", { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
]);

export default eslintConfig;

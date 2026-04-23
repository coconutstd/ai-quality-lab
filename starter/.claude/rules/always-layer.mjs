// SSOT — "항상 계층" Hard 규칙 단일 출처.
//
// 이 파일이 규칙의 권위. 경로 화이트리스트·레이아웃처럼 프로젝트 특정 값은
// `./config.mjs` 에서 import하여 여기서는 도메인 중립으로 유지한다.
//
// 소비자:
//   1) .claude/hooks/guard-always-layer.mjs   — PreToolUse 시점 실행
//   2) CLAUDE.md                              — BEGIN/END 마커 사이를 sync-rules.mjs가 생성
//
// 수정 순서:
//   1) 여기 또는 config.mjs 를 고친다
//   2) `npm run sync:rules` 로 CLAUDE.md 재생성
//   3) `npm run test:guard` / `npm run pr:gate` 로 회귀 확인

import { CONFIG } from "./config.mjs";

const APPLIES = {
  tsLike: (p) => /\.(ts|tsx)$/.test(p) && !/\/__tests__\//.test(p),
  jsFamily: (p) => /\.(ts|tsx|js|jsx)$/.test(p),
  jsxLike: (p) => /\.(tsx|jsx)$/.test(p),
  envOrJs: (p) => /\.(ts|tsx|js|jsx|mjs)$/.test(p) || /\.env/.test(p),
};

function matchFirst(content, patterns) {
  for (const re of patterns) {
    const m = content.match(re);
    if (m) return m.index ?? 0;
  }
  return -1;
}

export const RULES = [
  {
    id: "R1",
    label: "any 타입 사용 금지",
    sourceRule: "rules/01-type-safety.md",
    rationale: "any 는 타입 시스템을 끈다. 모르는 입력은 unknown + 타입 가드로.",
    summary: "`any` 사용 금지. 모르는 입력은 `unknown` + 타입 가드. `as` 강제 캐스팅 지양.",
    remediation: "→ `unknown` + 타입 가드, 또는 구체 타입/제네릭",
    appliesToPath: APPLIES.tsLike,
    detect: (content) => {
      const idx = matchFirst(content, [
        /:\s*any(?![A-Za-z0-9_$])/,       // annotation
        /<\s*any(?![A-Za-z0-9_$])/,       // generic arg
        /\bas\s+any(?![A-Za-z0-9_$])/,    // cast
        /\bany\s*\[\s*\]/,                 // array shorthand: any[]
      ]);
      return idx >= 0 ? { index: idx } : null;
    },
  },
  {
    id: "R2",
    label: "localStorage 토큰 저장 금지",
    sourceRule: "rules/03-security.md",
    rationale: "JS가 읽을 수 있는 스토리지에 토큰을 두면 XSS 한 건으로 계정 탈취. httpOnly 쿠키 사용.",
    summary: "`localStorage`에 토큰/JWT 저장 금지 → httpOnly 쿠키.",
    remediation: "→ httpOnly 쿠키",
    appliesToPath: APPLIES.jsFamily,
    detect: (content) => {
      const re = /localStorage\.setItem\s*\(\s*['"`](?:token|accessToken|jwt|authToken|refreshToken)/i;
      const m = content.match(re);
      return m ? { index: m.index ?? 0 } : null;
    },
  },
  {
    id: "R3",
    label: "dangerouslySetInnerHTML 호출부 직접 사용 금지",
    sourceRule: "rules/03-security.md",
    rationale: "XSS sink. 호출부마다 sanitize를 잊을 수 있음. <SafeHtml /> 한 곳에만 봉인.",
    summary: "`dangerouslySetInnerHTML` 호출부 직접 사용 금지 → `<SafeHtml />`.",
    remediation: "→ `<SafeHtml html={...} />`",
    appliesToPath: (p) =>
      APPLIES.jsxLike(p) && !CONFIG.SAFE_HTML_SINK_PATHS.some((re) => re.test(p)),
    detect: (content) => {
      const m = content.match(/dangerouslySetInnerHTML/);
      return m ? { index: m.index ?? 0 } : null;
    },
  },
  {
    id: "R4",
    label: "console.log로 민감 정보 출력 금지",
    sourceRule: "rules/03-security.md",
    rationale: "토큰/비밀번호/시크릿이 로그 파이프라인·에러 트래킹·브라우저 devtools에 남음.",
    summary: "`console.log`로 토큰/비밀번호/시크릿 출력 금지.",
    remediation: "→ 제거, 또는 민감값 마스킹",
    appliesToPath: APPLIES.jsFamily,
    detect: (content) => {
      const re = /console\.(log|info|debug|warn|error)\s*\([^)]*\b(token|password|secret|apiKey|api_key)\b/i;
      const m = content.match(re);
      return m ? { index: m.index ?? 0 } : null;
    },
  },
  {
    id: "R5",
    label: "NEXT_PUBLIC_ prefix에 시크릿 넣기 금지",
    sourceRule: "rules/03-security.md",
    rationale: "NEXT_PUBLIC_* 는 클라이언트 번들에 인라인됨. SECRET/PRIVATE/PASSWORD 이름이면 거의 항상 실수.",
    summary: "`NEXT_PUBLIC_*_SECRET|PRIVATE|PASSWORD` 금지 (번들 유출).",
    remediation: "→ 서버 전용 env (NEXT_PUBLIC_ 접두사 제거)",
    appliesToPath: APPLIES.envOrJs,
    detect: (content) => {
      const re = /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|PRIVATE|PASSWORD)/;
      const m = content.match(re);
      return m ? { index: m.index ?? 0 } : null;
    },
  },
];

export function excerpt(content, index, radius = 60) {
  const start = Math.max(0, index - radius);
  const end = Math.min(content.length, index + radius);
  return content.slice(start, end).replace(/\s+/g, " ").trim();
}

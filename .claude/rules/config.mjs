// 프로젝트-로컬 설정. 경로 레이아웃·sink 화이트리스트처럼 프로젝트마다 달라질 수 있는 값을
// 여기 모은다. SSOT(always-layer.mjs)는 이 설정을 읽어 쓴다.
//
// 새 프로젝트로 이식할 때 이 파일만 상황에 맞게 수정하면 된다.

export const CONFIG = {
  // 컴포넌트 디렉토리. audit-components.mjs가 동반 산출물을 검사하는 기준 경로.
  // monorepo나 src/components 구조면 여기를 바꾼다. (예: "src/components")
  COMPONENTS_DIR: "components",

  // dangerouslySetInnerHTML 를 정당하게 사용하는 "sink" 컴포넌트 경로들.
  // 이 목록에 포함된 파일에서만 R3 규칙을 면제한다. sink는 sanitize 래퍼를 한 곳에 봉인.
  // 새 프로젝트에선 기본적으로 빈 배열로 시작 — 필요할 때 sink 컴포넌트를 만들고 여기 추가.
  SAFE_HTML_SINK_PATHS: [/components\/SafeHtml\.tsx$/],

  // audit-components.mjs 에서 story/test 검사 예외. 예외 컴포넌트가 생기면 이름만 추가.
  AUDIT_EXCLUDE: [],
};

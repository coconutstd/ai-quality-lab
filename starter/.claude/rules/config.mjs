// 프로젝트-로컬 설정. 이식 후 여기를 먼저 확인/수정하세요.
//
// SSOT(always-layer.mjs) 와 audit-components.mjs 는 이 설정을 읽어 씁니다.
// 프로젝트마다 달라질 값만 여기 모읍니다 — 규칙 자체는 always-layer.mjs 에.

export const CONFIG = {
  // 컴포넌트 디렉토리. audit-components 가 동반 산출물(story/test) 검사 기준 경로.
  // 예: "components", "src/components", "packages/ui/src"
  COMPONENTS_DIR: "components",

  // dangerouslySetInnerHTML 를 정당하게 사용하는 "sink" 컴포넌트의 파일 경로 패턴.
  // 이 목록에 포함된 파일에서만 R3 규칙이 면제됩니다.
  // 새 프로젝트 기본값은 빈 배열 — 어디서도 dangerouslySetInnerHTML 을 쓸 수 없게 시작.
  // 불가피하면 sanitize 래퍼(예: <SafeHtml />)를 한 곳에 만들고 그 경로 정규식을 추가하세요.
  // 예: /components\/SafeHtml\.tsx$/
  SAFE_HTML_SINK_PATHS: [],

  // audit-components 에서 story/test 쌍을 면제할 컴포넌트 이름(.tsx 확장자 제외).
  // 장식적 Fragment 래퍼처럼 테스트가 의미 없는 경우에만 예외 추가.
  AUDIT_EXCLUDE: [],
};

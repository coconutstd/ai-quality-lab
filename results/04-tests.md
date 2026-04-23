# 실험 04: Tests 결과

## 측정 일시
2026-04-23

## 베이스라인 (적용 전)

| 항목 | 수치 |
|---|---|
| 테스트 파일 | 0개 |
| 테스트 케이스 | 0개 |
| 테스트 러너 | 없음 |
| CI에서 검증 가능한 동작 | 0개 |

## 적용 후

| 항목 | 수치 |
|---|---|
| 테스트 파일 | **4개** |
| 테스트 케이스 | **29개** (모두 통과) |
| 실행 시간 | **604ms** (단위 테스트, 4 파일 병렬) |
| 테스트 러너 | Vitest 3 + happy-dom |
| TypeScript strict 에러 | 0 |
| ESLint 에러 | 0 |

## 변경 내용

### 신규 인프라
- `vitest.config.mts` — Vitest 3 + `happy-dom` 환경, `tsconfig-paths` 별칭(`@/lib/*`) 자동 인식
- `vitest.setup.ts` — `@testing-library/jest-dom` matcher 로드
- `package.json` — `npm test`, `npm run test:run` 스크립트
- `tsconfig.json` — `types: ["vitest/globals", "@testing-library/jest-dom"]`

### 테스트 파일

**`lib/__tests__/schemas.test.ts` (11 cases)**
- `PostSchema` valid/invalid 케이스 4개
- `PostListSchema` empty array, mixed invalid
- `UserSchema` malformed email
- `LoginInputSchema` valid + 한국어 에러 메시지(이메일/비밀번호) 검증
- `LoginResultSchema` — **token 필드가 응답에 섞여와도 결과에 포함되지 않음을 잠금** (실험 03의 보안 컨트랙트)

**`lib/__tests__/sanitize.test.ts` (6 cases)**
- `<script>`, `onclick=`, `<iframe>`, `javascript:` href — 모두 제거되는지
- whitelist 태그(`<strong>`, `<em>`, `<li>`) 보존
- 빈 문자열 처리

**`lib/__tests__/api.test.ts` (7 cases)**
- `vi.mock('../http')`로 axios 인스턴스 격리
- `fetchPosts`/`fetchPost`/`createPost`/`deletePost` 각각 happy path + 잘못된 응답 형태 + 인터셉터 에러 전파

**`lib/__tests__/auth.test.ts` (5 cases)**
- `login` 성공, **응답에 token이 섞여 와도 결과에 노출되지 않음** (보안 회귀 방지)
- 잘못된 응답 throw, 인터셉터 에러 전파
- `logout` 엔드포인트 호출

## 규칙 체크리스트 결과

### 커버리지
- [x] zod 스키마 valid + invalid 경로
- [x] sanitize의 대표 XSS 페이로드 4종(스크립트/이벤트/iframe/javascript:)
- [x] API 함수 성공 + 서버 에러 + 잘못된 응답 형태
- [x] 외부 의존성(`http` 모듈) 모킹 격리

### 작성 규칙
- [x] AAA 구조 — `mockResolvedValueOnce` (Arrange) → 호출 (Act) → `expect` (Assert)
- [x] 테스트 이름이 동작 서술형 (`rejects a post with non-numeric id`, `does not return a token (httpOnly cookie contract)` 등)
- [x] 한 테스트 = 한 동작
- [x] 외부 상태 의존 없음 (`beforeEach`마다 `vi.clearAllMocks()`)

### CI/검증
- [x] `npm run test:run`로 전체 실행
- [x] 전체 604ms (한 파일당 평균 150ms 이하)
- [x] 실패 메시지에서 어떤 케이스가 왜 실패했는지 즉시 식별 가능

## 평가

**성공.** 02·03·zod 실험에서 만든 컨트랙트들이 **회귀 방지망 안에 들어옴.** 이제 보안/에러 처리 규칙은 코드뿐 아니라 테스트로도 잠겨 있다.

### 보안 컨트랙트의 테스트 잠금 (특히 주목)

```ts
it('does not return a token (httpOnly cookie contract)', async () => {
  mockedPost.mockResolvedValueOnce({
    data: { user: {...}, token: 'leaked' },
  })
  const result = await login('a@b.com', 'password!')
  expect(result).not.toHaveProperty('token')
})
```

→ "서버가 실수로 token을 응답 본문에 넣어도 클라이언트 코드는 그걸 만질 수 없다"는 **03 실험의 보안 약속**이 테스트로 명문화됨. 미래에 누군가 `LoginResultSchema`에 `token: z.string()`을 추가하면 즉시 RED.

### 함정 — 라이브러리 호환성 지옥 (실시간으로 잡은 것)

| 시도 | 문제 | 해결 |
|---|---|---|
| Vitest 4 RC | rolldown 네이티브 바인딩 누락 (npm optional dep 버그) | Vitest 3로 다운그레이드 |
| `@vitejs/plugin-react@6` | vite 8 + rolldown 강제 → 같은 문제 | v4로 다운그레이드 |
| `vitest.config.ts` (CJS) | ESM-only 플러그인 require 실패 | `.mts`로 확장자 변경 |
| `jsdom@29` | `html-encoding-sniffer`의 ESM/CJS 충돌 | happy-dom으로 교체 |
| `isomorphic-dompurify` | jsdom을 의존성으로 끌고 옴 | 클라이언트 전용 `dompurify`로 교체 |

→ 이 5개 함정은 모두 **AI에게 "테스트 환경 깔아줘"라고만 시켰을 때 학습 데이터 기준 최신 버전을 그대로 골라서 발생하는 현실적 비용**. 실제 사용자가 마주칠 가치가 있는 기록.

### 부수 효과

- `lib/sanitize.ts`가 `dompurify`만 의존하게 되어 번들 사이즈 감소 (jsdom 트랜지티브 제거)
- 09 실험 후보였던 a11y 테스트도 같은 인프라로 추가 가능

## 다음 실험 후보

- 05. **리팩터링 with 안전망** — 이번 테스트를 안전망 삼아 `dangerouslySetInnerHTML` 봉인
- 06. 폼 통합 테스트 — `@testing-library/user-event`로 RHF 폼 동작 검증
- 06. CI 워크플로우 — GitHub Actions로 `test:run` + `lint` + `tsc` 자동 실행

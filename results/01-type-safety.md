# 실험 01: Type Safety 결과

## 측정 일시
2026-04-22

## 베이스라인 (적용 전)

| 항목 | 수치 |
|---|---|
| `: any` 타입 개수 | 16 |
| TypeScript strict 에러 | 미측정 (any로 인해 에러 숨김) |

## 적용 후

| 항목 | 수치 |
|---|---|
| `: any` 타입 개수 | **0** |
| TypeScript strict 에러 | **0** |

## 변경 내용

### 추가한 파일
- `lib/types.ts` — 공유 인터페이스 정의 (`Post`, `User`, `LoginResponse`)

### 수정한 파일
| 파일 | 주요 변경 |
|---|---|
| `lib/api.ts` | 파라미터/반환값 타입 명시, `unknown` + 타입 가드로 API 응답 검증 |
| `lib/auth.ts` | `email: string`, `password: string` 명시, `LoginResponse` 반환 타입 |
| `app/login/page.tsx` | `React.FormEvent<HTMLFormElement>`, `React.ChangeEvent<HTMLInputElement>` |
| `app/posts/page.tsx` | `useState<Post[]>`, `id: number` 파라미터 |
| `app/posts/[id]/page.tsx` | `useState<Post | null>`, `params: Promise<{ id: string }>` + `use()` |

## 규칙 체크리스트 결과

- [x] `any` 타입 사용 금지
- [x] API 응답마다 `interface` 정의
- [x] 함수 파라미터와 반환값 타입 명시
- [x] `as` 캐스팅 최소화 (타입 가드로 대체)
- [x] `null` 가능성 명시 (`Post | null`, `string | null`)
- [x] 외부 API 응답 `unknown`으로 받고 타입 가드로 좁히기

## 평가

**성공.** 규칙 파일을 컨텍스트로 주자 체크리스트 6개 항목 모두 충족.

### 주목할 점
- 타입 가드(`isPost`, `isPostArray`) 자동 생성 — 단순 타입 제거를 넘어 런타임 검증까지 추가됨
- Next.js 15의 `params: Promise<{ id: string }>` + `use()` 패턴 적용 (버전 인식)
- 실험 02·03 이슈(에러 핸들링, 보안)는 의도적으로 보존 → 다음 실험 측정 가능

## 다음 실험
→ `rules/02-error-handling.md` 적용

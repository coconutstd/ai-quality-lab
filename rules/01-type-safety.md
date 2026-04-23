# Rule 01: Type Safety

## 목적
`any` 타입 남발 없이, 모든 데이터 구조를 명시적으로 정의한다.

## 규칙 체크리스트

- [ ] `any` 타입 사용 금지 (불가피한 경우 `unknown` + 타입 가드 사용)
- [ ] API 응답마다 `interface` 또는 `type` 정의 필수
- [ ] 함수 파라미터와 반환값에 타입 명시
- [ ] `as` 캐스팅 최소화 — 필요 시 타입 가드로 대체
- [ ] `undefined` / `null` 가능성 명시 (optional chaining, nullish coalescing 활용)
- [ ] 외부 API 응답은 `unknown`으로 받고 검증 후 타입 좁히기

## 나쁜 예

```typescript
// ❌ any 남발
const fetchUser = async (id: any) => {
  const res = await fetch(`/api/users/${id}`)
  const data: any = await res.json()
  return data
}

// ❌ 암묵적 any
function processPost(post) {
  return post.title.toUpperCase()
}
```

## 좋은 예

```typescript
// ✅ 명시적 타입 정의
interface User {
  id: number
  name: string
  email: string
}

const fetchUser = async (id: number): Promise<User> => {
  const res = await fetch(`/api/users/${id}`)
  const data: unknown = await res.json()
  if (!isUser(data)) throw new Error('Invalid user response')
  return data
}

// ✅ 타입 가드
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data
  )
}
```

## 검증 방법

```bash
# any 잔존 개수 확인
grep -rn ": any" app/ lib/ --include="*.ts" --include="*.tsx" | wc -l

# TypeScript 컴파일 에러 확인
npx tsc --noEmit --strict
```

## 적용 대상 파일
- `lib/api.ts`
- `lib/auth.ts`
- `app/login/page.tsx`
- `app/posts/page.tsx`

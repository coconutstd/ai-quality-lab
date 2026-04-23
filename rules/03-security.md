# Rule 03: Security

## 목적
XSS, 인증 토큰 노출, 입력 검증 부재 등 흔한 보안 취약점을 제거한다.

## 규칙 체크리스트

### 인증 토큰
- [ ] `localStorage`에 JWT 저장 금지 → `httpOnly` 쿠키 사용
- [ ] 토큰을 클라이언트 JS 코드에 하드코딩 금지
- [ ] 민감한 정보를 URL 파라미터로 전달 금지

### XSS 방지
- [ ] `dangerouslySetInnerHTML` 사용 금지 (불가피한 경우 DOMPurify로 sanitize)
- [ ] 사용자 입력을 그대로 렌더링 금지
- [ ] 외부 데이터 표시 시 React의 자동 escape 의존 (직접 DOM 조작 금지)

### 입력 검증
- [ ] 폼 입력값 클라이언트 사이드 검증 필수
- [ ] 서버로 보내기 전 이메일 형식, 비밀번호 길이 등 기본 검증
- [ ] SQL Injection 방어: 파라미터화된 쿼리 사용 (ORM 활용)

### API 요청
- [ ] 민감한 API 키를 클라이언트 번들에 포함 금지 (`NEXT_PUBLIC_` prefix 주의)
- [ ] 환경변수로 관리, `.env.local`은 `.gitignore`에 포함

### 기타
- [ ] `console.log`로 민감한 데이터 출력 금지 (토큰, 패스워드 등)
- [ ] HTTPS가 아닌 경로로 인증 요청 금지

## 나쁜 예

```typescript
// ❌ localStorage에 토큰 저장
localStorage.setItem('token', data.token)

// ❌ dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: post.content }} />

// ❌ 입력 검증 없음
const handleLogin = (e) => {
  e.preventDefault()
  fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// ❌ 콘솔에 토큰 출력
console.log('token:', token)
```

## 좋은 예

```typescript
// ✅ 서버사이드에서 httpOnly 쿠키로 토큰 관리
// 클라이언트는 토큰 직접 접근 불가

// ✅ 입력 검증
const handleLogin = (e: React.FormEvent) => {
  e.preventDefault()
  if (!email.includes('@')) return setError('올바른 이메일을 입력하세요')
  if (password.length < 8) return setError('비밀번호는 8자 이상이어야 합니다')
  // ...
}

// ✅ 사용자 콘텐츠는 React가 자동 escape
<p>{post.content}</p>

// ✅ 환경변수 서버사이드 전용
const apiKey = process.env.API_SECRET_KEY  // NEXT_PUBLIC_ 아님
```

## 검증 방법

```bash
# localStorage 토큰 저장 찾기
grep -rn "localStorage.setItem" app/ lib/ --include="*.ts" --include="*.tsx"

# dangerouslySetInnerHTML 찾기
grep -rn "dangerouslySetInnerHTML" app/ --include="*.tsx"

# NEXT_PUBLIC_ 키 노출 찾기
grep -rn "NEXT_PUBLIC_" app/ lib/ --include="*.ts" --include="*.tsx"

# console.log 민감 정보 찾기
grep -rn "console.log.*token\|console.log.*password" app/ lib/ --include="*.ts" --include="*.tsx"
```

## 적용 대상 파일
- `lib/auth.ts`
- `app/login/page.tsx`
- `app/posts/[id]/page.tsx`

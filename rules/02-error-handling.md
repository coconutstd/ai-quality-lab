# Rule 02: Error Handling

## 목적
Happy path만 처리하는 코드에서 벗어나, 모든 실패 경로를 명시적으로 다룬다.

## 규칙 체크리스트

- [ ] 모든 `async/await` 호출에 `try-catch` 또는 `.catch()` 필수
- [ ] 로딩 상태(`isLoading`) UI 반드시 표시
- [ ] 에러 상태(`error`) UI 반드시 표시 (사용자가 읽을 수 있는 메시지)
- [ ] 네트워크 에러와 비즈니스 에러 구분 처리
- [ ] `fetch` 응답은 `response.ok` 체크 필수 (`4xx`, `5xx` 처리)
- [ ] 에러 발생 시 콘솔에만 남기지 말고 사용자에게 피드백 제공
- [ ] 폼 제출 시 중복 클릭 방지 (제출 중 버튼 비활성화)

## 나쁜 예

```typescript
// ❌ try-catch 없음
const login = async (email: string, password: string) => {
  const res = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  localStorage.setItem('token', data.token)
}

// ❌ 로딩/에러 상태 없음
export default function PostList() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    fetch('/api/posts').then(r => r.json()).then(setPosts)
  }, [])

  return <ul>{posts.map(p => <li>{p.title}</li>)}</ul>
}
```

## 좋은 예

```typescript
// ✅ 에러 처리 + 로딩 상태
export default function PostList() {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/posts')
        if (!res.ok) throw new Error(`서버 오류: ${res.status}`)
        const data: unknown = await res.json()
        setPosts(validatePosts(data))
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  if (isLoading) return <p>로딩 중...</p>
  if (error) return <p>오류: {error}</p>
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

## 검증 방법

```bash
# try-catch 없는 await 찾기
grep -rn "await " app/ lib/ --include="*.ts" --include="*.tsx" | grep -v "try\|catch\|test\|spec" | wc -l

# response.ok 체크 없는 fetch 찾기
grep -rn "await fetch" app/ lib/ --include="*.ts" --include="*.tsx" | wc -l
```

## 적용 대상 파일
- `lib/api.ts`
- `lib/auth.ts`
- `app/login/page.tsx`
- `app/posts/page.tsx`

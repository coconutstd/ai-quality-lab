import { useMemo } from 'react'
import { sanitizeHtml } from '@/lib/sanitize'

interface SafeHtmlProps extends React.HTMLAttributes<HTMLDivElement> {
  html: string
}

// 사용자 작성 HTML을 안전하게 렌더한다.
// dangerouslySetInnerHTML은 이 컴포넌트 안에서만 사용 — 호출부는 절대 직접 쓸 수 없도록 봉인.
export function SafeHtml({ html, ...divProps }: SafeHtmlProps) {
  const safe = useMemo(() => sanitizeHtml(html), [html])
  return <div {...divProps} dangerouslySetInnerHTML={{ __html: safe }} />
}

import DOMPurify from 'dompurify'

// target="_blank" 링크에 noopener noreferrer 자동 부여 → tabnapping 차단
// (target 속성 자체는 화이트리스트에서 제외, hook으로 안전하게 처리)
let hookInstalled = false
function ensureHook() {
  if (hookInstalled) return
  if (typeof window === 'undefined') return
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node instanceof HTMLAnchorElement && node.hasAttribute('target')) {
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
  hookInstalled = true
}

// 사용자 작성 HTML(블로그 본문 등)에서 스크립트/이벤트 핸들러를 제거
// 직접 렌더링이 불가피한 경우에만 사용. 평문 표시는 React의 자동 escape 사용.
export function sanitizeHtml(dirty: string): string {
  ensureHook()
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  })
}

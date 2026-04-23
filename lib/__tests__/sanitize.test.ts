import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '../sanitize'

describe('sanitizeHtml', () => {
  it('strips <script> tags', () => {
    const dirty = '<p>hi</p><script>alert(1)</script>'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toMatch(/<script/i)
    expect(clean).toContain('<p>hi</p>')
  })

  it('strips inline event handlers', () => {
    const dirty = '<a href="/x" onclick="alert(1)">click</a>'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toMatch(/onclick/i)
    expect(clean).toContain('href="/x"')
  })

  it('strips <iframe>', () => {
    // sanitize는 문자열만 다루므로 src 값은 무관 — 빈 src로 happy-dom의 fetch 시도 회피
    const dirty = '<iframe src="about:blank"></iframe><p>ok</p>'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toMatch(/<iframe/i)
    expect(clean).toContain('<p>ok</p>')
  })

  it('strips javascript: hrefs', () => {
    const dirty = '<a href="javascript:alert(1)">x</a>'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toMatch(/javascript:/i)
  })

  it('preserves whitelisted tags and text', () => {
    const dirty =
      '<p><strong>bold</strong> and <em>italic</em></p><ul><li>1</li><li>2</li></ul>'
    const clean = sanitizeHtml(dirty)
    expect(clean).toContain('<strong>bold</strong>')
    expect(clean).toContain('<em>italic</em>')
    expect(clean).toContain('<li>1</li>')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('')
  })

  it('adds rel="noopener noreferrer" to anchors with target (CodeRabbit catch — tabnapping)', () => {
    const dirty = '<a href="https://example.com" target="_blank">link</a>'
    const clean = sanitizeHtml(dirty)
    expect(clean).toMatch(/rel=("|')noopener noreferrer("|')/)
  })
})

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SafeHtml } from '../SafeHtml'

describe('<SafeHtml>', () => {
  it('renders whitelisted markup', () => {
    const { container } = render(<SafeHtml html="<p><strong>hi</strong></p>" />)
    expect(container.querySelector('strong')?.textContent).toBe('hi')
  })

  it('strips <script> from input', () => {
    const { container } = render(
      <SafeHtml html='<p>ok</p><script>window.x=1</script>' />,
    )
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('ok')
  })

  it('strips inline event handlers', () => {
    const { container } = render(
      <SafeHtml html='<a href="/x" onclick="alert(1)">link</a>' />,
    )
    const a = container.querySelector('a')
    expect(a).not.toBeNull()
    expect(a?.getAttribute('onclick')).toBeNull()
    expect(a?.getAttribute('href')).toBe('/x')
  })

  it('forwards extra div props (e.g. className)', () => {
    const { container } = render(
      <SafeHtml html="<p>x</p>" className="prose" data-testid="content" />,
    )
    const div = container.querySelector('div')
    expect(div?.className).toBe('prose')
    expect(div?.getAttribute('data-testid')).toBe('content')
  })
})

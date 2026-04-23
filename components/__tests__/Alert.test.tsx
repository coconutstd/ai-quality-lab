import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Alert } from '../Alert'
import { setLocale } from '@/lib/i18n'

describe('<Alert>', () => {
  it('renders with role="alert" and wires aria-labelledby/aria-describedby', () => {
    render(
      <Alert variant="error" title="오류">
        본문 메시지
      </Alert>,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()

    const titleId = alert.getAttribute('aria-labelledby')
    const bodyId = alert.getAttribute('aria-describedby')
    expect(titleId).toBeTruthy()
    expect(bodyId).toBeTruthy()
    expect(document.getElementById(titleId!)?.textContent).toBe('오류')
    expect(document.getElementById(bodyId!)?.textContent).toBe('본문 메시지')
  })

  it('fires onDismiss when the localized dismiss button is clicked', async () => {
    setLocale('ko')
    const onDismiss = vi.fn()
    const user = userEvent.setup()

    render(
      <Alert variant="warning" dismissible onDismiss={onDismiss}>
        내용
      </Alert>,
    )

    const button = screen.getByRole('button', { name: '닫기' })
    await user.click(button)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('omits aria-labelledby when no title is provided', () => {
    render(<Alert>간단한 본문</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert.getAttribute('aria-labelledby')).toBeNull()
    expect(alert.getAttribute('aria-describedby')).toBeTruthy()
  })
})

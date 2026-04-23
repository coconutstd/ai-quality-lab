import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '../ConfirmDialog'
import { setLocale } from '@/lib/i18n'
import { setAdapter, type Adapter } from '@/lib/analytics'

beforeEach(() => {
  setLocale('ko')
  setAdapter(() => {
    /* reset to noop */
  })
})

describe('<ConfirmDialog>', () => {
  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders with role=dialog and aria-modal, wiring title/description ids', () => {
    render(
      <ConfirmDialog
        open
        title="삭제"
        message="정말 삭제할까요?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    const titleId = dialog.getAttribute('aria-labelledby')
    const descId = dialog.getAttribute('aria-describedby')
    expect(titleId).toBeTruthy()
    expect(descId).toBeTruthy()
    expect(document.getElementById(titleId!)?.textContent).toBe('삭제')
    expect(document.getElementById(descId!)?.textContent).toBe('정말 삭제할까요?')
  })

  it('focuses the confirm button when opened', () => {
    render(
      <ConfirmDialog open onConfirm={() => {}} onCancel={() => {}} />,
    )
    const confirmBtn = screen.getByRole('button', { name: '확인' })
    expect(document.activeElement).toBe(confirmBtn)
  })

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()

    render(
      <ConfirmDialog open onConfirm={onConfirm} onCancel={onCancel} />,
    )
    await user.click(screen.getByRole('button', { name: '확인' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('calls onCancel when Escape is pressed', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()

    render(
      <ConfirmDialog open onConfirm={onConfirm} onCancel={onCancel} />,
    )
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('fires analytics events when analyticsId is provided', async () => {
    const adapter = vi.fn<Adapter>()
    setAdapter(adapter)
    const user = userEvent.setup()

    render(
      <ConfirmDialog
        open
        variant="danger"
        analyticsId="delete-post"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    // open event fires on mount
    expect(adapter).toHaveBeenCalledWith('confirm.dialog.open', {
      id: 'delete-post',
      variant: 'danger',
    })

    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(adapter).toHaveBeenCalledWith('confirm.dialog.cancel', {
      id: 'delete-post',
      variant: 'danger',
      via: 'button',
    })
  })

  it('disables buttons while isConfirming', () => {
    render(
      <ConfirmDialog
        open
        isConfirming
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: '확인' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy', 'true')
  })
})

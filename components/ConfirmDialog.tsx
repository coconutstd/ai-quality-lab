'use client'

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { t } from '@/lib/i18n'
import { track } from '@/lib/analytics'

type ConfirmVariant = 'default' | 'danger'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  isConfirming?: boolean
  analyticsId?: string
  onConfirm: () => void
  onCancel: () => void
}

const VARIANT_CONFIRM_COLOR: Record<ConfirmVariant, string> = {
  default: '#0b5394',
  danger: '#b00020',
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  isConfirming = false,
  analyticsId,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descId = useId()
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    confirmBtnRef.current?.focus()
    if (analyticsId) {
      track('confirm.dialog.open', { id: analyticsId, variant })
    }
  }, [open, analyticsId, variant])

  if (!open) return null

  const resolvedTitle = title ?? t('confirm.default.title')
  const resolvedMessage = message ?? t('confirm.default.message')
  const resolvedConfirm = confirmLabel ?? t('confirm.button.confirm')
  const resolvedCancel = cancelLabel ?? t('confirm.button.cancel')

  // ESC 처리는 오버레이 내부 포커스에 의존 — 초기 포커스가 confirm 버튼에 붙으므로 정상 작동.
  // 포커스가 외부로 탈출하면 no-op이 된다(포커스 트랩 미구현, G3). starter 승격 시 document-level로 옮길 것.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (analyticsId) {
        track('confirm.dialog.cancel', { id: analyticsId, variant, via: 'escape' })
      }
      onCancel()
    }
  }

  const handleCancel = () => {
    if (analyticsId) {
      track('confirm.dialog.cancel', { id: analyticsId, variant, via: 'button' })
    }
    onCancel()
  }

  const handleConfirm = () => {
    if (analyticsId) {
      track('confirm.dialog.confirm', { id: analyticsId, variant })
    }
    onConfirm()
  }

  return (
    <div
      role="presentation"
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-busy={isConfirming}
        style={{
          background: 'white',
          color: 'black',
          borderRadius: 8,
          padding: '1.25rem 1.5rem',
          minWidth: 320,
          maxWidth: 480,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h2 id={titleId} style={{ margin: 0, marginBottom: 8, fontSize: '1.125rem' }}>
          {resolvedTitle}
        </h2>
        <div id={descId} style={{ marginBottom: 16, color: '#333' }}>
          {resolvedMessage}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isConfirming}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ccc',
              background: 'white',
              borderRadius: 4,
              cursor: isConfirming ? 'not-allowed' : 'pointer',
            }}
          >
            {resolvedCancel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            aria-busy={isConfirming}
            style={{
              padding: '0.5rem 1rem',
              border: 0,
              background: VARIANT_CONFIRM_COLOR[variant],
              color: 'white',
              borderRadius: 4,
              cursor: isConfirming ? 'not-allowed' : 'pointer',
            }}
          >
            {resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  )
}

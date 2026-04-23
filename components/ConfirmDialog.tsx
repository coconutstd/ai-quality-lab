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

  const isDanger = variant === 'danger'

  return (
    <div
      role="presentation"
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[1000] flex items-center justify-center px-6 bg-[color:var(--overlay)]"
      style={{ animation: 'lab-overlay-in 180ms ease-out both' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-busy={isConfirming}
        className="w-full max-w-[480px] bg-[color:var(--paper)] border border-[color:var(--ink)] relative"
        style={{
          boxShadow: '10px 10px 0 0 var(--ink)',
          animation: 'lab-dialog-in 220ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        }}
      >
        <div className="absolute top-0 left-6 right-6 flex justify-between text-[10px] font-mono tracking-[0.2em] uppercase text-[color:var(--meta)] -translate-y-1/2">
          <span className="bg-[color:var(--paper)] px-2" style={{ color: isDanger ? 'var(--danger)' : 'var(--ink)' }}>
            {isDanger ? '⚠ Caution' : 'Confirm'}
          </span>
          <span className="bg-[color:var(--paper)] px-2">Modal · 01</span>
        </div>

        <div className="px-7 pt-8 pb-6">
          <h2
            id={titleId}
            className="display text-[26px] leading-[1.1]"
            style={{ color: isDanger ? 'var(--danger)' : 'var(--ink)' }}
          >
            {resolvedTitle}
          </h2>
          <div id={descId} className="mt-3 text-[14.5px] leading-relaxed text-[color:var(--ink-soft)]">
            {resolvedMessage}
          </div>
        </div>

        <div className="border-t border-[color:var(--rule-strong)] px-6 py-4 flex items-center justify-between gap-3 bg-[color:var(--paper-2)]/40">
          <span className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-[color:var(--meta)]">
            {isConfirming ? 'Processing…' : 'Awaiting decision'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isConfirming}
              className="btn btn-ghost !py-2.5 !px-4"
            >
              {resolvedCancel}
            </button>
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={handleConfirm}
              disabled={isConfirming}
              aria-busy={isConfirming}
              className={`btn !py-2.5 !px-4 ${isDanger ? 'btn-danger' : ''}`}
            >
              {resolvedConfirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

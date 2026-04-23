'use client'

import { useId, type HTMLAttributes, type ReactNode } from 'react'
import { t } from '@/lib/i18n'
import { track } from '@/lib/analytics'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'children'> {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  analyticsId?: string
}

// Editorial palette — each variant uses a bar on the left + tinted paper background.
// Kept as CSS custom properties rather than Tailwind arbitrary values to stay legible.
const VARIANT_STYLES: Record<AlertVariant, { accent: string; label: string }> = {
  info: { accent: 'var(--ink)', label: 'Note' },
  success: { accent: 'var(--moss)', label: 'OK' },
  warning: { accent: 'var(--ochre)', label: 'Warn' },
  error: { accent: 'var(--danger)', label: 'Error' },
}

export function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  analyticsId,
  className,
  ...rest
}: AlertProps) {
  const titleId = useId()
  const bodyId = useId()
  const { accent, label } = VARIANT_STYLES[variant]

  const handleDismiss = () => {
    if (analyticsId) {
      track('alert.dismiss.click', { id: analyticsId, variant })
    }
    onDismiss?.()
  }

  return (
    <div
      role="alert"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={bodyId}
      className={[
        'relative flex items-start justify-between gap-4 pl-5 pr-4 py-3.5',
        'bg-[color:var(--paper-2)]/60',
        className ?? '',
      ].join(' ')}
      style={{
        borderLeft: `3px solid ${accent}`,
        color: 'var(--ink)',
      }}
      {...rest}
    >
      <span
        aria-hidden
        className="absolute -top-0 left-5 -translate-y-1/2 bg-[color:var(--paper)] px-1.5 font-mono text-[10px] tracking-[0.18em] uppercase"
        style={{ color: accent }}
      >
        {label}
      </span>
      <div className="flex-1 min-w-0 pt-1">
        {title && (
          <strong
            id={titleId}
            className="block font-mono text-[11.5px] tracking-[0.14em] uppercase mb-1"
            style={{ color: accent }}
          >
            {title}
          </strong>
        )}
        <span id={bodyId} className="text-[14px] leading-relaxed text-[color:var(--ink-soft)]">
          {children}
        </span>
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('alert.button.dismiss')}
          className="shrink-0 text-[color:var(--meta)] hover:text-[color:var(--ink)] transition-colors text-base leading-none px-1 cursor-pointer"
        >
          ✕
        </button>
      )}
    </div>
  )
}

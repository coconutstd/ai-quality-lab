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

const VARIANT_COLORS: Record<AlertVariant, string> = {
  info: '#0b5394',
  success: '#137333',
  warning: '#b06000',
  error: '#b00020',
}

export function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  analyticsId,
  ...rest
}: AlertProps) {
  const titleId = useId()
  const bodyId = useId()

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
      style={{
        border: `1px solid ${VARIANT_COLORS[variant]}`,
        color: VARIANT_COLORS[variant],
        padding: '0.75rem 1rem',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
      {...rest}
    >
      <div>
        {title && (
          <strong id={titleId} style={{ display: 'block', marginBottom: 4 }}>
            {title}
          </strong>
        )}
        <span id={bodyId}>{children}</span>
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('alert.button.dismiss')}
          style={{
            background: 'transparent',
            border: 0,
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}

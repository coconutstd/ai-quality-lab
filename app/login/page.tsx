'use client'

import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { login } from '@/lib/auth'
import { LoginInput, LoginInputSchema } from '@/lib/schemas'
import { t } from '@/lib/i18n'
import { track } from '@/lib/analytics'

export default function LoginPage() {
  const emailId = useId()
  const passwordId = useId()
  const emailErrId = useId()
  const passwordErrId = useId()
  const rootErrId = useId()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
    mode: 'onBlur',
  })

  const loginMutation = useMutation({
    mutationFn: (vars: LoginInput) => login(vars.email, vars.password),
    onSuccess: (result) => {
      track('auth.login.success', { userId: result.user.id })
      window.location.href = '/posts'
    },
    onError: (err: Error) => {
      track('auth.login.failure', { reason: err.message })
      setError('root', { message: err.message })
    },
  })

  const isLoading = isSubmitting || loginMutation.isPending

  return (
    <div>
      <h1>{t('login.title')}</h1>
      <p id={rootErrId} role="alert" style={{ color: 'red' }}>
        {errors.root?.message}
      </p>
      <form
        onSubmit={handleSubmit((data) => {
          // PII 보호: 원본 email 대신 도메인만 트래킹
          const emailDomain = data.email.split('@')[1] ?? 'unknown'
          track('auth.login.attempt', { emailDomain })
          loginMutation.mutate(data)
        })}
        noValidate
        aria-busy={isLoading}
      >
        <label htmlFor={emailId}>{t('login.label.email')}</label>
        <input
          id={emailId}
          type="email"
          {...register('email')}
          autoComplete="email"
          disabled={isLoading}
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? emailErrId : undefined}
        />
        <p id={emailErrId} role="alert" style={{ color: 'red' }}>
          {errors.email?.message}
        </p>

        <label htmlFor={passwordId}>{t('login.label.password')}</label>
        <input
          id={passwordId}
          type="password"
          {...register('password')}
          autoComplete="current-password"
          disabled={isLoading}
          aria-invalid={errors.password ? 'true' : 'false'}
          aria-describedby={errors.password ? passwordErrId : undefined}
        />
        <p id={passwordErrId} role="alert" style={{ color: 'red' }}>
          {errors.password?.message}
        </p>

        <button type="submit" disabled={isLoading}>
          {isLoading ? t('login.button.submitting') : t('login.button.submit')}
        </button>
      </form>
    </div>
  )
}

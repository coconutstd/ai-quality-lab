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
    <div className="page-container py-16 md:py-24">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-start">
        <aside className="md:col-span-5 lab-rise">
          <div className="eyebrow mb-5">Folio 03 · Credentials</div>
          <h1 className="display text-[56px] md:text-[72px] leading-[0.95]">
            Sign <em>in</em>
            <br />
            to the lab.
          </h1>
          <div className="rule-tick mt-8" />
          <p className="mt-6 text-[15px] leading-7 text-[color:var(--ink-soft)] max-w-sm">
            Access is gated by an httpOnly cookie — no tokens are stored in{' '}
            <code className="font-mono text-[13px] bg-[color:var(--paper-2)] px-1.5 py-0.5">
              localStorage
            </code>
            . This form is validated by the same Zod schema the server uses.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 max-w-sm">
            <MetaRow label="Protocol" value="httpOnly · SameSite" />
            <MetaRow label="Schema" value="LoginInputSchema" />
            <MetaRow label="Locale" value="ko-KR" />
            <MetaRow label="Trace" value="auth.login.attempt" />
          </dl>
        </aside>

        <section className="md:col-span-7 md:col-start-7 lab-rise lab-delay-2">
          <div className="border border-[color:var(--ink)] bg-[color:var(--paper)] relative">
            <div className="absolute -top-px left-6 right-6 flex justify-between text-[10px] font-mono text-[color:var(--meta)] -translate-y-1/2 bg-[color:var(--paper)] px-2">
              <span className="tracking-[0.2em]">FORM · 01</span>
              <span className="tracking-[0.2em]">SHEET 01 / 01</span>
            </div>

            <form
              onSubmit={handleSubmit((data) => {
                const emailDomain = data.email.split('@')[1] ?? 'unknown'
                track('auth.login.attempt', { emailDomain })
                loginMutation.mutate(data)
              })}
              noValidate
              aria-busy={isLoading}
              className="p-8 md:p-12 flex flex-col gap-8"
            >
              <div>
                <div className="chip chip-vermillion">{t('login.title')}</div>
              </div>

              {errors.root?.message && (
                <div id={rootErrId} role="alert" className="inline-error">
                  {errors.root.message}
                </div>
              )}
              {!errors.root?.message && (
                <p id={rootErrId} role="alert" className="sr-only" />
              )}

              <div className="field">
                <label htmlFor={emailId} className="field-label">
                  {t('login.label.email')}
                </label>
                <input
                  id={emailId}
                  type="email"
                  className="input"
                  {...register('email')}
                  autoComplete="email"
                  disabled={isLoading}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? emailErrId : undefined}
                />
                <p id={emailErrId} role="alert" className="error-text">
                  {errors.email?.message}
                </p>
              </div>

              <div className="field">
                <label htmlFor={passwordId} className="field-label">
                  {t('login.label.password')}
                </label>
                <input
                  id={passwordId}
                  type="password"
                  className="input"
                  {...register('password')}
                  autoComplete="current-password"
                  disabled={isLoading}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? passwordErrId : undefined}
                />
                <p id={passwordErrId} role="alert" className="error-text">
                  {errors.password?.message}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 mt-2 border-t border-[color:var(--rule)]">
                <span className="meta-line">
                  {isLoading ? 'Transmitting…' : 'Ready'}
                </span>
                <button type="submit" disabled={isLoading} className="btn">
                  {isLoading ? t('login.button.submitting') : t('login.button.submit')}
                  <span aria-hidden>→</span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[10px] tracking-[0.2em] uppercase text-[color:var(--meta)]">
        {label}
      </dt>
      <dd className="font-mono text-[12px] text-[color:var(--ink)]">{value}</dd>
    </div>
  )
}

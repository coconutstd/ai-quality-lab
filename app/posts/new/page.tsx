'use client'

import { useId } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createPost } from '@/lib/api'
import { CreatePostInput, CreatePostInputSchema } from '@/lib/schemas'
import { t } from '@/lib/i18n'
import { track } from '@/lib/analytics'

export default function NewPostPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const titleId = useId()
  const contentId = useId()
  const titleErrId = useId()
  const contentErrId = useId()
  const rootErrId = useId()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreatePostInput>({
    resolver: zodResolver(CreatePostInputSchema),
    mode: 'onBlur',
  })

  const createMutation = useMutation({
    mutationFn: (vars: CreatePostInput) => createPost(vars.title, vars.content),
    onSuccess: (post) => {
      track('post.create.success', { postId: post.id })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      router.push(`/posts/${post.id}`)
    },
    onError: (err: Error) => {
      track('post.create.failure', { reason: err.message })
      setError('root', { message: err.message })
    },
  })

  const isLoading = isSubmitting || createMutation.isPending

  return (
    <div className="page-container py-14 md:py-20">
      <div className="mb-10 flex items-center justify-between gap-4 lab-rise">
        <Link href="/posts" className="meta-line hover:text-[color:var(--vermillion)] transition-colors">
          ← Index
        </Link>
        <span className="meta-line">Composition Desk</span>
      </div>

      <header className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end lab-rise lab-delay-1">
        <div className="md:col-span-9">
          <div className="eyebrow mb-4">Folio 04 · Compose</div>
          <h1 className="display text-[56px] md:text-[88px] leading-[0.95]">
            A new <em>entry</em>.
          </h1>
        </div>
      </header>

      <div className="rule-tick mt-10 mb-12" />

      <form
        onSubmit={handleSubmit((data) => {
          track('post.create.attempt', {})
          createMutation.mutate(data)
        })}
        noValidate
        aria-busy={isLoading}
        className="grid grid-cols-1 md:grid-cols-12 gap-10 lab-rise lab-delay-2"
      >
        <aside className="md:col-span-3 space-y-5 meta-line-sm">
          <div>
            <div className="mb-1">Desk</div>
            <div className="text-[color:var(--ink)] text-[13px]">Editorial</div>
          </div>
          <div>
            <div className="mb-1">Schema</div>
            <div className="text-[color:var(--ink)] text-[13px]">CreatePostInput</div>
          </div>
          <div>
            <div className="mb-1">Limits</div>
            <div className="text-[color:var(--ink)] text-[13px]">Title ≤ 120</div>
          </div>
        </aside>

        <div className="md:col-span-9 space-y-10">
          {errors.root?.message && (
            <div id={rootErrId} role="alert" className="inline-error">
              {errors.root.message}
            </div>
          )}
          {!errors.root?.message && <p id={rootErrId} role="alert" className="sr-only" />}

          <div className="field">
            <label htmlFor={titleId} className="field-label">
              {t('post.new.label.title')}
            </label>
            <input
              id={titleId}
              type="text"
              {...register('title')}
              disabled={isLoading}
              className="input input-display"
              aria-invalid={errors.title ? 'true' : 'false'}
              aria-describedby={errors.title ? titleErrId : undefined}
              placeholder="Write a headline…"
            />
            <p id={titleErrId} role="alert" className="error-text">
              {errors.title?.message}
            </p>
          </div>

          <div className="field">
            <label htmlFor={contentId} className="field-label">
              {t('post.new.label.content')}
            </label>
            <textarea
              id={contentId}
              {...register('content')}
              rows={14}
              disabled={isLoading}
              className="textarea"
              aria-invalid={errors.content ? 'true' : 'false'}
              aria-describedby={errors.content ? contentErrId : undefined}
              placeholder="Begin the body copy here. HTML is permitted and sanitized via DOMPurify."
            />
            <p id={contentErrId} role="alert" className="error-text">
              {errors.content?.message}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-[color:var(--rule-strong)] pt-6">
            <span className="meta-line">
              {isLoading ? 'Transmitting…' : 'Ready to press'}
            </span>
            <button type="submit" disabled={isLoading} className="btn">
              {isLoading ? t('post.new.button.submitting') : t('post.new.button.submit')}
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

'use client'

import { useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createComment, fetchComments } from '@/lib/api'
import {
  Comment,
  CreateCommentInput,
  CreateCommentInputSchema,
} from '@/lib/schemas'
import { t } from '@/lib/i18n'
import { track } from '@/lib/analytics'

interface CommentListProps {
  postId: number
}

export function CommentList({ postId }: CommentListProps) {
  const queryClient = useQueryClient()
  const queryKey = ['posts', postId, 'comments'] as const
  const bodyId = useId()
  const bodyErrId = useId()
  const rootErrId = useId()

  useEffect(() => {
    track('comment.list.view', { postId })
  }, [postId])

  const commentsQuery = useQuery({
    queryKey,
    queryFn: () => fetchComments(postId),
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<CreateCommentInput>({
    resolver: zodResolver(CreateCommentInputSchema),
    mode: 'onBlur',
  })

  const createMutation = useMutation({
    mutationFn: (vars: CreateCommentInput) => createComment(postId, vars.body),
    onSuccess: (comment) => {
      track('comment.create.success', { postId, commentId: comment.id })
      queryClient.invalidateQueries({ queryKey })
      reset()
    },
    onError: (err: Error) => {
      track('comment.create.failure', { postId, reason: err.message })
      setError('root', { message: err.message })
    },
  })

  const isLoading = isSubmitting || createMutation.isPending
  const count = commentsQuery.data?.length

  return (
    <section aria-label={t('comment.section.label')} className="mt-4">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="display text-[28px] md:text-[32px]">
          {t('comment.section.title')}
        </h2>
        <span className="meta-line tabular-nums">
          {typeof count === 'number' ? `${String(count).padStart(2, '0')} entries` : '—'}
        </span>
      </header>

      <div className="rule-soft my-5" />

      {commentsQuery.isPending && (
        <p
          role="status"
          aria-live="polite"
          className="font-mono text-sm text-[color:var(--meta)] py-3"
        >
          {t('comment.loading')}
        </p>
      )}

      {commentsQuery.isError && (
        <div role="alert" className="inline-error">
          {t('comment.error', { message: commentsQuery.error.message })}
        </div>
      )}

      {commentsQuery.data && commentsQuery.data.length === 0 && (
        <p className="font-mono text-[12px] tracking-[0.1em] uppercase text-[color:var(--meta)] py-3">
          {t('comment.empty')}
        </p>
      )}

      {commentsQuery.data && commentsQuery.data.length > 0 && (
        <ul className="divide-y divide-[color:var(--rule)]">
          {commentsQuery.data.map((c: Comment, idx) => (
            <li
              key={c.id}
              className="grid grid-cols-[auto_1fr] gap-5 md:gap-8 py-5 items-start"
            >
              <span className="meta-line-sm tabular-nums pt-1">
                № {String(idx + 1).padStart(2, '0')}
              </span>
              <div>
                <div className="font-mono text-[11.5px] tracking-[0.14em] uppercase text-[color:var(--vermillion)]">
                  {c.author}
                </div>
                <p className="mt-1.5 text-[15px] leading-7 text-[color:var(--ink-soft)]">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {errors.root?.message && (
        <div id={rootErrId} role="alert" className="inline-error mt-6">
          {errors.root.message}
        </div>
      )}
      {!errors.root?.message && <p id={rootErrId} role="alert" className="sr-only" />}

      <form
        onSubmit={handleSubmit((data) => {
          track('comment.create.attempt', { postId })
          createMutation.mutate(data)
        })}
        noValidate
        aria-busy={isLoading}
        className="mt-8"
      >
        <label htmlFor={bodyId} className="sr-only">
          {t('comment.label.body')}
        </label>
        <textarea
          id={bodyId}
          {...register('body')}
          placeholder={t('comment.placeholder')}
          rows={3}
          disabled={isLoading}
          className="textarea w-full"
          aria-invalid={errors.body ? 'true' : 'false'}
          aria-describedby={errors.body ? bodyErrId : undefined}
        />
        <p id={bodyErrId} role="alert" className="error-text">
          {errors.body?.message}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="meta-line-sm">Margin note</span>
          <button type="submit" disabled={isLoading} className="btn">
            {isLoading ? t('comment.button.submitting') : t('comment.button.submit')}
          </button>
        </div>
      </form>
    </section>
  )
}

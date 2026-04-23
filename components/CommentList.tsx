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

  return (
    <section aria-label={t('comment.section.label')}>
      <h2>{t('comment.section.title')}</h2>

      {commentsQuery.isPending && (
        <p role="status" aria-live="polite">
          {t('comment.loading')}
        </p>
      )}
      {commentsQuery.isError && (
        <p role="alert" style={{ color: 'red' }}>
          {t('comment.error', { message: commentsQuery.error.message })}
        </p>
      )}
      {commentsQuery.data && commentsQuery.data.length === 0 && (
        <p>{t('comment.empty')}</p>
      )}
      {commentsQuery.data && commentsQuery.data.length > 0 && (
        <ul>
          {commentsQuery.data.map((c: Comment) => (
            <li key={c.id}>
              <strong>{c.author}</strong>: {c.body}
            </li>
          ))}
        </ul>
      )}

      <p id={rootErrId} role="alert" style={{ color: 'red' }}>
        {errors.root?.message}
      </p>
      <form
        onSubmit={handleSubmit((data) => {
          track('comment.create.attempt', { postId })
          createMutation.mutate(data)
        })}
        noValidate
        aria-busy={isLoading}
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
          aria-invalid={errors.body ? 'true' : 'false'}
          aria-describedby={errors.body ? bodyErrId : undefined}
        />
        <p id={bodyErrId} role="alert" style={{ color: 'red' }}>
          {errors.body?.message}
        </p>
        <button type="submit" disabled={isLoading}>
          {isLoading ? t('comment.button.submitting') : t('comment.button.submit')}
        </button>
      </form>
    </section>
  )
}

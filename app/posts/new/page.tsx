'use client'

import { useId } from 'react'
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
    <div>
      <h1>{t('post.new.title')}</h1>
      <p id={rootErrId} role="alert" style={{ color: 'red' }}>
        {errors.root?.message}
      </p>
      <form
        onSubmit={handleSubmit((data) => {
          track('post.create.attempt', {})
          createMutation.mutate(data)
        })}
        noValidate
        aria-busy={isLoading}
      >
        <label htmlFor={titleId}>{t('post.new.label.title')}</label>
        <input
          id={titleId}
          type="text"
          {...register('title')}
          disabled={isLoading}
          aria-invalid={errors.title ? 'true' : 'false'}
          aria-describedby={errors.title ? titleErrId : undefined}
        />
        <p id={titleErrId} role="alert" style={{ color: 'red' }}>
          {errors.title?.message}
        </p>

        <label htmlFor={contentId}>{t('post.new.label.content')}</label>
        <textarea
          id={contentId}
          {...register('content')}
          rows={10}
          disabled={isLoading}
          aria-invalid={errors.content ? 'true' : 'false'}
          aria-describedby={errors.content ? contentErrId : undefined}
        />
        <p id={contentErrId} role="alert" style={{ color: 'red' }}>
          {errors.content?.message}
        </p>

        <button type="submit" disabled={isLoading}>
          {isLoading ? t('post.new.button.submitting') : t('post.new.button.submit')}
        </button>
      </form>
    </div>
  )
}

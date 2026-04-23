'use client'

import { use, useEffect, useId, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { fetchPost, updatePost } from '@/lib/api'
import { UpdatePostInput, UpdatePostInputSchema } from '@/lib/schemas'
import { t } from '@/lib/i18n'
import { track } from '@/lib/analytics'

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const postId = Number(id)
  const router = useRouter()
  const queryClient = useQueryClient()

  const titleId = useId()
  const contentId = useId()
  const titleErrId = useId()
  const contentErrId = useId()
  const rootErrId = useId()

  useEffect(() => {
    track('post.edit.view', { postId })
  }, [postId])

  const postQuery = useQuery({
    queryKey: ['posts', postId],
    queryFn: () => fetchPost(postId),
    // 편집 중 백그라운드 리페치가 사용자의 입력을 덮어쓰지 않도록 편집 화면 안에서는 stale 고정.
    staleTime: Infinity,
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<UpdatePostInput>({
    resolver: zodResolver(UpdatePostInputSchema),
    mode: 'onBlur',
  })

  // 서버 초기값을 **한 번만** 폼에 세팅. RHF의 `values` 옵션은 refetch 시 사용자 입력을
  // 덮어쓸 수 있어 피하고, 첫 로드 1회만 reset 하도록 ref 가드.
  const initializedRef = useRef(false)
  useEffect(() => {
    if (initializedRef.current) return
    if (!postQuery.data) return
    reset({ title: postQuery.data.title, content: postQuery.data.content })
    initializedRef.current = true
  }, [postQuery.data, reset])

  const updateMutation = useMutation({
    mutationFn: (vars: UpdatePostInput) => updatePost(postId, vars),
    onSuccess: (post) => {
      track('post.update.success', { postId: post.id })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.setQueryData(['posts', post.id], post)
      reset({ title: post.title, content: post.content })
      router.push(`/posts/${post.id}`)
    },
    onError: (err: Error) => {
      track('post.update.failure', { postId, reason: err.message })
      setError('root', { message: err.message })
    },
  })

  if (postQuery.isPending) {
    return (
      <p role="status" aria-live="polite">
        {t('common.loading')}
      </p>
    )
  }
  if (postQuery.isError) {
    return (
      <p role="alert" style={{ color: 'red' }}>
        {t('common.error', { message: postQuery.error.message })}
      </p>
    )
  }

  const isLoading = isSubmitting || updateMutation.isPending

  return (
    <div>
      <h1>{t('post.edit.title')}</h1>
      <p id={rootErrId} role="alert" style={{ color: 'red' }}>
        {errors.root?.message}
      </p>
      <form
        onSubmit={handleSubmit((data) => {
          track('post.update.attempt', { postId })
          updateMutation.mutate(data)
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
          {isLoading ? t('post.edit.button.submitting') : t('post.edit.button.submit')}
        </button>
      </form>
    </div>
  )
}

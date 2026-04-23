'use client'

import { use, useEffect, useId, useRef } from 'react'
import Link from 'next/link'
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
      <div className="page-container py-24">
        <p
          role="status"
          aria-live="polite"
          className="font-mono text-sm text-[color:var(--meta)]"
        >
          {t('common.loading')}
        </p>
      </div>
    )
  }
  if (postQuery.isError) {
    return (
      <div className="page-container py-24">
        <div role="alert" className="inline-error">
          {t('common.error', { message: postQuery.error.message })}
        </div>
      </div>
    )
  }

  const isLoading = isSubmitting || updateMutation.isPending

  return (
    <div className="page-container py-14 md:py-20">
      <div className="mb-10 flex items-center justify-between gap-4 lab-rise">
        <Link href={`/posts/${postId}`} className="meta-line hover:text-[color:var(--vermillion)] transition-colors">
          ← Entry
        </Link>
        <span className="meta-line">
          Revise · № {String(postId).padStart(3, '0')}
        </span>
      </div>

      <header className="lab-rise lab-delay-1">
        <div className="eyebrow mb-4">Folio 05 · Revise</div>
        <h1 className="display text-[56px] md:text-[80px] leading-[0.95]">
          Press <em>revisions</em>.
        </h1>
      </header>

      <div className="rule-tick mt-10 mb-12" />

      <form
        onSubmit={handleSubmit((data) => {
          track('post.update.attempt', { postId })
          updateMutation.mutate(data)
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
            <div className="text-[color:var(--ink)] text-[13px]">UpdatePostInput</div>
          </div>
          <div>
            <div className="mb-1">Cache</div>
            <div className="text-[color:var(--ink)] text-[13px]">staleTime ∞</div>
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
              {isLoading ? t('post.edit.button.submitting') : t('post.edit.button.submit')}
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

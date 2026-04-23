'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deletePost, fetchPost } from '@/lib/api'
import { CommentList } from '@/components/CommentList'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { SafeHtml } from '@/components/SafeHtml'
import { t } from '@/lib/i18n'
import { track } from '@/lib/analytics'

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const postId = Number(id)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    track('post.detail.view', { postId })
  }, [postId])

  const postQuery = useQuery({
    queryKey: ['posts', postId],
    queryFn: () => fetchPost(postId),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(postId),
    onSuccess: () => {
      track('post.delete.success', { postId })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      setConfirmOpen(false)
      router.push('/posts')
    },
    onError: (err: Error) => {
      track('post.delete.failure', { postId, reason: err.message })
      setConfirmOpen(false)
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

  const post = postQuery.data

  return (
    <article className="page-container py-14 md:py-20">
      <div className="mb-10 flex items-center justify-between gap-4 lab-rise">
        <Link href="/posts" className="meta-line hover:text-[color:var(--vermillion)] transition-colors">
          ← Back to Index
        </Link>
        <span className="meta-line">
          Entry № {String(postId).padStart(3, '0')}
        </span>
      </div>

      <header className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-end lab-rise lab-delay-1">
        <div className="md:col-span-9">
          <div className="eyebrow mb-5">Folio 02 · Article</div>
          <h1 className="display text-[44px] md:text-[72px] leading-[0.98] break-keep">
            {post.title}
          </h1>
        </div>
        <aside className="md:col-span-3 md:justify-self-end space-y-3 meta-line">
          <div>
            <span className="text-[color:var(--vermillion)]">§</span> Author
          </div>
          <div className="text-[color:var(--ink)] text-[13px]">{post.author}</div>
        </aside>
      </header>

      <div className="rule-tick mt-10 mb-4" />
      <div className="flex items-center gap-3 lab-rise lab-delay-2">
        <Link href={`/posts/${postId}/edit`} className="btn-link">
          {t('post.detail.editLink')}
        </Link>
        <span className="text-[color:var(--rule-strong)]">·</span>
        <button
          type="button"
          onClick={() => {
            track('post.delete.attempt', { postId })
            setConfirmOpen(true)
          }}
          disabled={deleteMutation.isPending}
          className="btn-link btn-link-danger disabled:opacity-50"
        >
          {t('post.detail.deleteButton')}
        </button>
      </div>

      {deleteMutation.isError && (
        <div role="alert" className="inline-error mt-6">
          {t('post.list.deleteError', { message: deleteMutation.error.message })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mt-14 lab-rise lab-delay-3">
        <aside className="md:col-span-2 md:sticky md:top-28 md:self-start space-y-4 meta-line-sm">
          <div>
            <div className="mb-1">Vol.</div>
            <div className="text-[color:var(--ink)] text-[14px]">01</div>
          </div>
          <div>
            <div className="mb-1">Ref.</div>
            <div className="text-[color:var(--ink)] text-[14px] tabular-nums">
              {String(postId).padStart(3, '0')}
            </div>
          </div>
          <div className="rule-soft" />
        </aside>
        <div className="md:col-span-8 md:col-start-3 prose-lab max-w-[66ch]">
          <SafeHtml html={post.content} />
        </div>
      </div>

      <div className="mt-20 md:col-span-8 md:col-start-3 md:ml-[16.666%]">
        <div className="rule-tick mb-8" />
        <CommentList postId={postId} />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        variant="danger"
        title={t('post.detail.deleteConfirmTitle')}
        message={t('post.detail.deleteConfirmMessage', { title: post.title })}
        confirmLabel={t('post.detail.deleteButton')}
        isConfirming={deleteMutation.isPending}
        analyticsId="post-detail-delete"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
      />
    </article>
  )
}

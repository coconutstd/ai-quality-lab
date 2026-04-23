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

  const post = postQuery.data

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{t('post.detail.author', { author: post.author })}</p>

      <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
        <Link href={`/posts/${postId}/edit`}>{t('post.detail.editLink')}</Link>
        <button
          type="button"
          onClick={() => {
            track('post.delete.attempt', { postId })
            setConfirmOpen(true)
          }}
          disabled={deleteMutation.isPending}
        >
          {t('post.detail.deleteButton')}
        </button>
      </div>

      {deleteMutation.isError && (
        <p role="alert" style={{ color: 'red' }}>
          {t('post.list.deleteError', { message: deleteMutation.error.message })}
        </p>
      )}

      <SafeHtml html={post.content} />
      <CommentList postId={postId} />

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

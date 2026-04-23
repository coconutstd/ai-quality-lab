'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPosts, deletePost } from '@/lib/api'
import { Post } from '@/lib/schemas'
import { t } from '@/lib/i18n'
import { track } from '@/lib/analytics'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import Link from 'next/link'

export default function PostsPage() {
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = useState<Post | null>(null)

  useEffect(() => {
    track('post.list.view', {})
  }, [])

  const postsQuery = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  })

  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: (_data, postId) => {
      track('post.delete.success', { postId })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      setPendingDelete(null)
    },
    onError: (err: Error, postId) => {
      track('post.delete.failure', { postId, reason: err.message })
      setPendingDelete(null)
    },
  })

  if (postsQuery.isPending) {
    return (
      <p role="status" aria-live="polite">
        {t('common.loading')}
      </p>
    )
  }
  if (postsQuery.isError) {
    return (
      <p role="alert" style={{ color: 'red' }}>
        {t('common.error', { message: postsQuery.error.message })}
      </p>
    )
  }

  return (
    <div>
      <h1>{t('post.list.title')}</h1>
      <Link href="/posts/new">{t('post.list.newLink')}</Link>
      {deleteMutation.isError && (
        <p role="alert" style={{ color: 'red' }}>
          {t('post.list.deleteError', { message: deleteMutation.error.message })}
        </p>
      )}
      <ul>
        {postsQuery.data.map((post: Post) => {
          const isDeleting =
            deleteMutation.isPending && deleteMutation.variables === post.id
          return (
            <li key={post.id}>
              <Link href={`/posts/${post.id}`}>{post.title}</Link>
              <button
                type="button"
                onClick={() => {
                  track('post.delete.attempt', { postId: post.id })
                  setPendingDelete(post)
                }}
                disabled={isDeleting}
                aria-label={t('post.list.deleteAria', { title: post.title })}
              >
                {isDeleting ? t('post.list.deletingButton') : t('post.list.deleteButton')}
              </button>
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={pendingDelete !== null}
        variant="danger"
        title={t('post.list.deleteConfirmTitle')}
        message={
          pendingDelete
            ? t('post.list.deleteConfirmMessage', { title: pendingDelete.title })
            : ''
        }
        confirmLabel={t('post.list.deleteButton')}
        isConfirming={deleteMutation.isPending}
        analyticsId="post-list-delete"
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id)
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

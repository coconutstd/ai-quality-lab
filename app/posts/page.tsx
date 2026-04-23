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

  return (
    <div className="page-container py-14 md:py-20">
      <header className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-end lab-rise">
        <div className="md:col-span-8">
          <div className="eyebrow mb-4">Folio 01 · Index</div>
          <h1 className="display text-[64px] md:text-[96px] leading-[0.92]">
            The <em>Posts</em>,
            <br />
            collected.
          </h1>
        </div>
        <aside className="md:col-span-4 flex md:justify-end md:items-end">
          <Link href="/posts/new" className="btn">
            {t('post.list.newLink')}
            <span aria-hidden>＋</span>
          </Link>
        </aside>
      </header>

      <div className="rule-tick mt-10 mb-4" />
      <div className="flex flex-wrap items-center justify-between gap-3 meta-line">
        <span>
          <span className="text-[color:var(--vermillion)]">§</span> Issue MMXXVI · Spring
        </span>
        <span>
          {postsQuery.data ? String(postsQuery.data.length).padStart(2, '0') : '—'} entries
        </span>
      </div>

      <section className="mt-10">
        {postsQuery.isPending && (
          <p role="status" aria-live="polite" className="font-mono text-sm text-[color:var(--meta)] py-16 text-center">
            {t('common.loading')}
          </p>
        )}

        {postsQuery.isError && (
          <div role="alert" className="inline-error">
            {t('common.error', { message: postsQuery.error.message })}
          </div>
        )}

        {deleteMutation.isError && (
          <div role="alert" className="inline-error mb-6">
            {t('post.list.deleteError', { message: deleteMutation.error.message })}
          </div>
        )}

        {postsQuery.data && (
          <ul className="divide-y divide-[color:var(--rule-strong)] border-y border-[color:var(--rule-strong)]">
            {postsQuery.data.map((post: Post, idx) => {
              const isDeleting =
                deleteMutation.isPending && deleteMutation.variables === post.id
              return (
                <li
                  key={post.id}
                  className={`group grid grid-cols-[auto_1fr_auto] items-baseline gap-4 md:gap-8 py-6 md:py-8 hover:bg-[color:var(--paper-2)]/40 transition-colors lab-rise lab-delay-${Math.min(idx, 5)}`}
                >
                  <span className="meta-line tabular-nums self-start pt-2">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <Link href={`/posts/${post.id}`} className="block">
                    <h2 className="display text-[26px] md:text-[32px] leading-[1.05] group-hover:text-[color:var(--vermillion)] transition-colors">
                      {post.title}
                    </h2>
                    <div className="mt-2 meta-line">
                      Entry № {String(post.id).padStart(3, '0')} ·{' '}
                      <span className="text-[color:var(--ink-soft)]">Read →</span>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      track('post.delete.attempt', { postId: post.id })
                      setPendingDelete(post)
                    }}
                    disabled={isDeleting}
                    aria-label={t('post.list.deleteAria', { title: post.title })}
                    className="btn-link btn-link-danger disabled:opacity-50"
                  >
                    {isDeleting ? t('post.list.deletingButton') : t('post.list.deleteButton')}
                  </button>
                </li>
              )
            })}
            {postsQuery.data.length === 0 && (
              <li className="py-16 text-center font-mono text-sm text-[color:var(--meta)]">
                No entries yet. The press is cold.
              </li>
            )}
          </ul>
        )}
      </section>

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

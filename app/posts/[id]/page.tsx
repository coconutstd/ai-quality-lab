'use client'

import { use, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPost } from '@/lib/api'
import { CommentList } from '@/components/CommentList'
import { SafeHtml } from '@/components/SafeHtml'
import { t } from '@/lib/i18n'
import { track } from '@/lib/analytics'

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const postId = Number(id)

  useEffect(() => {
    track('post.detail.view', { postId })
  }, [postId])

  const postQuery = useQuery({
    queryKey: ['posts', postId],
    queryFn: () => fetchPost(postId),
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
      <SafeHtml html={post.content} />
      <CommentList postId={postId} />
    </article>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPosts, deletePost } from '@/lib/api'
import { track } from '@/lib/analytics'
import type { Post } from '@/lib/schemas'

export function usePosts() {
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

  function requestDelete(post: Post) {
    track('post.delete.attempt', { postId: post.id })
    setPendingDelete(post)
  }

  return {
    postsQuery,
    pendingDelete,
    requestDelete,
    confirmDelete: () => { if (pendingDelete) deleteMutation.mutate(pendingDelete.id) },
    cancelDelete: () => setPendingDelete(null),
    isDeleting: deleteMutation.isPending,
    isDeletingPost: (id: number) => deleteMutation.isPending && deleteMutation.variables === id,
    deleteError: deleteMutation.error,
  }
}

// Dev용 인메모리 mock store.
// 실험 17: 실제 백엔드 없이 Next.js route handler로 API를 시뮬레이션한다.
// 프로덕션 배포 용도가 아니며, HMR에도 데이터가 보존되도록 globalThis에 걸어둔다.

import type { Comment, Post } from '@/lib/schemas'

interface StoreState {
  posts: Post[]
  comments: Comment[]
  nextPostId: number
  nextCommentId: number
}

// Next.js dev는 route handler 마다 모듈을 재평가할 수 있어 module-level let은 매번 초기화될 위험이 있다.
// globalThis에 걸어서 프로세스 수명 동안 공유시킨다.
interface GlobalWithStore {
  __aiLabMockStore__?: StoreState
}

function globalStore(): GlobalWithStore {
  return globalThis as unknown as GlobalWithStore
}

function seed(): StoreState {
  const posts: Post[] = [
    {
      id: 1,
      title: '첫 번째 게시글',
      content:
        '<p>AI Quality Lab에 오신 것을 환영합니다.</p><p>이 본문은 <strong>SafeHtml</strong> 컴포넌트로 렌더됩니다.</p>',
      author: 'alice',
    },
    {
      id: 2,
      title: '하네스 관측 일지',
      content:
        '<p>실험 16에서 관측한 G1~G6 중 <em>G5</em>가 실험 17의 트리거였습니다.</p>',
      author: 'bob',
    },
    {
      id: 3,
      title: '파괴적 작업에는 확인을',
      content: '<p>ConfirmDialog 컴포넌트가 도입된 배경.</p>',
      author: 'carol',
    },
  ]
  const comments: Comment[] = [
    { id: 1, postId: 1, author: 'dan', body: '반갑습니다!' },
    { id: 2, postId: 1, author: 'erin', body: '첫 댓글 테스트.' },
    { id: 3, postId: 2, author: 'frank', body: 'G5가 정곡을 찔렀네요.' },
  ]
  return {
    posts,
    comments,
    nextPostId: 4,
    nextCommentId: 4,
  }
}

function getStore(): StoreState {
  const g = globalStore()
  if (!g.__aiLabMockStore__) {
    g.__aiLabMockStore__ = seed()
  }
  return g.__aiLabMockStore__
}

export function resetStore(): void {
  globalStore().__aiLabMockStore__ = seed()
}

export function listPosts(): Post[] {
  return getStore().posts
}

export function getPost(id: number): Post | undefined {
  return getStore().posts.find((p) => p.id === id)
}

export function createPost(input: { title: string; content: string; author?: string }): Post {
  const store = getStore()
  const post: Post = {
    id: store.nextPostId++,
    title: input.title,
    content: input.content,
    author: input.author ?? 'anonymous',
  }
  store.posts.push(post)
  return post
}

export function updatePost(id: number, input: { title: string; content: string }): Post | undefined {
  const store = getStore()
  const idx = store.posts.findIndex((p) => p.id === id)
  if (idx === -1) return undefined
  const next: Post = { ...store.posts[idx], title: input.title, content: input.content }
  store.posts[idx] = next
  return next
}

export function deletePost(id: number): boolean {
  const store = getStore()
  const before = store.posts.length
  store.posts = store.posts.filter((p) => p.id !== id)
  store.comments = store.comments.filter((c) => c.postId !== id)
  return store.posts.length < before
}

export function listComments(postId: number): Comment[] {
  return getStore().comments.filter((c) => c.postId === postId)
}

export function createComment(postId: number, input: { body: string; author?: string }): Comment {
  const store = getStore()
  const comment: Comment = {
    id: store.nextCommentId++,
    postId,
    author: input.author ?? 'anonymous',
    body: input.body,
  }
  store.comments.push(comment)
  return comment
}

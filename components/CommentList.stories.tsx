import type { Meta, StoryObj } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Comment } from '../lib/schemas'
import { CommentList } from './CommentList'

const meta: Meta<typeof CommentList> = {
  title: 'Components/CommentList',
  component: CommentList,
  parameters: {
    docs: {
      description: {
        component:
          "특정 게시글의 댓글 목록 + 작성 폼. " +
          "내부적으로 `useQuery({ queryKey: ['posts', postId, 'comments'] })`를 사용하므로 " +
          "스토리에서는 `queryClient.setQueryData`로 캐시를 priming하여 결정적 상태를 보여준다.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof CommentList>

const POST_ID = 10

function withPrimedCache(comments: Comment[] | undefined, isError = false) {
  const Decorator = (Story: React.ComponentType) => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    if (isError) {
      client.setQueryDefaults(['posts', POST_ID, 'comments'], {
        queryFn: () => Promise.reject(new Error('서버 오류: 500')),
      })
    } else if (comments) {
      client.setQueryData(['posts', POST_ID, 'comments'], comments)
    }
    return (
      <QueryClientProvider client={client}>
        <Story />
      </QueryClientProvider>
    )
  }
  Decorator.displayName = 'WithPrimedCache'
  return Decorator
}

export const Empty: Story = {
  args: { postId: POST_ID },
  decorators: [withPrimedCache([])],
}

export const WithComments: Story = {
  args: { postId: POST_ID },
  decorators: [
    withPrimedCache([
      { id: 1, postId: POST_ID, author: 'alice', body: '첫 댓글입니다' },
      { id: 2, postId: POST_ID, author: 'bob', body: '동의합니다, 안전망의 효과가 큽니다' },
      {
        id: 3,
        postId: POST_ID,
        author: 'carol',
        body: '특히 zod + RHF 조합이 인상적이네요',
      },
    ]),
  ],
}

export const Loading: Story = {
  args: { postId: POST_ID },
  // 캐시 priming도 안 하고 queryFn도 무한 대기 → 실제 로딩 상태
  decorators: [
    (Story) => {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            queryFn: () => new Promise(() => {}),
          },
        },
      })
      return (
        <QueryClientProvider client={client}>
          <Story />
        </QueryClientProvider>
      )
    },
  ],
}

export const ErrorState: Story = {
  name: 'Error',
  args: { postId: POST_ID },
  decorators: [withPrimedCache(undefined, true)],
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/api', () => ({
  fetchComments: vi.fn(),
  createComment: vi.fn(),
}))

import { fetchComments, createComment } from '@/lib/api'
import { setAdapter } from '@/lib/analytics'
import { CommentList } from '../CommentList'

const mockedFetch = vi.mocked(fetchComments)
const mockedCreate = vi.mocked(createComment)

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('<CommentList>', () => {
  it('renders comments fetched for the post', async () => {
    mockedFetch.mockResolvedValueOnce([
      { id: 1, postId: 10, author: 'alice', body: '첫 댓글' },
    ])
    renderWithClient(<CommentList postId={10} />)
    expect(await screen.findByText(/첫 댓글/)).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(mockedFetch).toHaveBeenCalledWith(10)
  })

  it('shows empty-state when there are no comments', async () => {
    mockedFetch.mockResolvedValueOnce([])
    renderWithClient(<CommentList postId={10} />)
    expect(await screen.findByText('아직 댓글이 없습니다.')).toBeInTheDocument()
  })

  it('blocks submit when body is empty (zod resolver)', async () => {
    const user = userEvent.setup()
    mockedFetch.mockResolvedValueOnce([])
    renderWithClient(<CommentList postId={10} />)
    await screen.findByText('아직 댓글이 없습니다.')

    await user.click(screen.getByRole('button', { name: '댓글 작성' }))
    expect(await screen.findByText('댓글을 입력하세요')).toBeInTheDocument()
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('connects error message to textarea via aria-describedby (a11y)', async () => {
    const user = userEvent.setup()
    mockedFetch.mockResolvedValueOnce([])
    renderWithClient(<CommentList postId={10} />)
    await screen.findByText('아직 댓글이 없습니다.')

    await user.click(screen.getByRole('button', { name: '댓글 작성' }))
    const textarea = screen.getByLabelText('댓글 입력')
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
    const describedBy = textarea.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const errEl = describedBy ? document.getElementById(describedBy) : null
    expect(errEl?.textContent).toBe('댓글을 입력하세요')
  })

  it('calls createComment with the right args on valid submit', async () => {
    const user = userEvent.setup()
    mockedFetch.mockResolvedValue([])
    mockedCreate.mockResolvedValueOnce({
      id: 2,
      postId: 10,
      author: 'me',
      body: '좋아요',
    })

    renderWithClient(<CommentList postId={10} />)
    await screen.findByText('아직 댓글이 없습니다.')

    await user.type(screen.getByPlaceholderText('댓글을 입력하세요'), '좋아요')
    await user.click(screen.getByRole('button', { name: '댓글 작성' }))

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith(10, '좋아요')
    })
  })

  it('tracks comment.list.view on mount and create lifecycle on submit', async () => {
    const user = userEvent.setup()
    const trackSpy = vi.fn()
    setAdapter(trackSpy)

    mockedFetch.mockResolvedValue([])
    mockedCreate.mockResolvedValueOnce({
      id: 99,
      postId: 10,
      author: 'me',
      body: '훌륭',
    })

    renderWithClient(<CommentList postId={10} />)
    await screen.findByText('아직 댓글이 없습니다.')

    expect(trackSpy).toHaveBeenCalledWith('comment.list.view', { postId: 10 })

    await user.type(screen.getByPlaceholderText('댓글을 입력하세요'), '훌륭')
    await user.click(screen.getByRole('button', { name: '댓글 작성' }))

    await waitFor(() => {
      expect(trackSpy).toHaveBeenCalledWith('comment.create.attempt', { postId: 10 })
    })
    await waitFor(() => {
      expect(trackSpy).toHaveBeenCalledWith('comment.create.success', {
        postId: 10,
        commentId: 99,
      })
    })

    setAdapter(() => {})
  })
})

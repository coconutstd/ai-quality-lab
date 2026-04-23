import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { http } from '../http'
import {
  fetchPost,
  fetchPosts,
  createPost,
  updatePost,
  deletePost,
  fetchComments,
  createComment,
} from '../api'

const mockedGet = vi.mocked(http.get)
const mockedPost = vi.mocked(http.post)
const mockedPut = vi.mocked(http.put)
const mockedDelete = vi.mocked(http.delete)

beforeEach(() => {
  vi.clearAllMocks()
})

const validPost = { id: 1, title: 't', content: 'c', author: 'a' }

describe('fetchPosts', () => {
  it('returns parsed posts on valid response', async () => {
    mockedGet.mockResolvedValueOnce({ data: [validPost] })
    await expect(fetchPosts()).resolves.toEqual([validPost])
    expect(mockedGet).toHaveBeenCalledWith('/posts')
  })

  it('throws when response is not an array', async () => {
    mockedGet.mockResolvedValueOnce({ data: { not: 'array' } })
    await expect(fetchPosts()).rejects.toThrow()
  })

  it('throws when an array element fails schema', async () => {
    mockedGet.mockResolvedValueOnce({ data: [{ id: 'bad' }] })
    await expect(fetchPosts()).rejects.toThrow()
  })
})

describe('fetchPost', () => {
  it('returns parsed post', async () => {
    mockedGet.mockResolvedValueOnce({ data: validPost })
    await expect(fetchPost(1)).resolves.toEqual(validPost)
    expect(mockedGet).toHaveBeenCalledWith('/posts/1')
  })

  it('propagates http errors', async () => {
    mockedGet.mockRejectedValueOnce(new Error('서버 오류: 500'))
    await expect(fetchPost(1)).rejects.toThrow('서버 오류: 500')
  })
})

describe('createPost', () => {
  it('sends body and parses response', async () => {
    mockedPost.mockResolvedValueOnce({ data: validPost })
    await createPost('t', 'c')
    expect(mockedPost).toHaveBeenCalledWith('/posts', { title: 't', content: 'c' })
  })
})

describe('updatePost', () => {
  it('sends PUT with body and parses response', async () => {
    mockedPut.mockResolvedValueOnce({ data: validPost })
    await expect(
      updatePost(1, { title: 't', content: 'c' }),
    ).resolves.toEqual(validPost)
    expect(mockedPut).toHaveBeenCalledWith('/posts/1', { title: 't', content: 'c' })
  })

  it('throws when response shape is wrong', async () => {
    mockedPut.mockResolvedValueOnce({ data: { wrong: true } })
    await expect(
      updatePost(1, { title: 't', content: 'c' }),
    ).rejects.toThrow()
  })
})

describe('deletePost', () => {
  it('calls DELETE on the right path', async () => {
    mockedDelete.mockResolvedValueOnce({ data: null })
    await deletePost(42)
    expect(mockedDelete).toHaveBeenCalledWith('/posts/42')
  })
})

const validComment = { id: 1, postId: 10, author: 'a', body: 'b' }

describe('fetchComments', () => {
  it('returns parsed comment list for a post', async () => {
    mockedGet.mockResolvedValueOnce({ data: [validComment] })
    await expect(fetchComments(10)).resolves.toEqual([validComment])
    expect(mockedGet).toHaveBeenCalledWith('/posts/10/comments')
  })

  it('throws when an element fails schema', async () => {
    mockedGet.mockResolvedValueOnce({ data: [{ id: 'bad' }] })
    await expect(fetchComments(10)).rejects.toThrow()
  })
})

describe('createComment', () => {
  it('posts to nested path with body', async () => {
    mockedPost.mockResolvedValueOnce({ data: validComment })
    await createComment(10, 'hi')
    expect(mockedPost).toHaveBeenCalledWith('/posts/10/comments', { body: 'hi' })
  })

  it('throws when response shape is wrong', async () => {
    mockedPost.mockResolvedValueOnce({ data: { unexpected: true } })
    await expect(createComment(10, 'hi')).rejects.toThrow()
  })
})

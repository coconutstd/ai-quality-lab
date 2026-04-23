import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../http', () => ({
  http: {
    post: vi.fn(),
  },
}))

import { http } from '../http'
import { login, logout } from '../auth'

const mockedPost = vi.mocked(http.post)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('login', () => {
  it('returns parsed user on success', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { user: { id: 1, email: 'a@b.com', name: 'A' } },
    })
    const result = await login('a@b.com', 'password!')
    expect(result.user.email).toBe('a@b.com')
    expect(mockedPost).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.com',
      password: 'password!',
    })
  })

  it('does not return a token (httpOnly cookie contract)', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        user: { id: 1, email: 'a@b.com', name: 'A' },
        token: 'leaked',
      },
    })
    const result = await login('a@b.com', 'password!')
    expect(result).not.toHaveProperty('token')
  })

  it('throws when response shape is wrong', async () => {
    mockedPost.mockResolvedValueOnce({ data: { foo: 'bar' } })
    await expect(login('a@b.com', 'password!')).rejects.toThrow()
  })

  it('propagates server error from interceptor', async () => {
    mockedPost.mockRejectedValueOnce(new Error('비밀번호가 올바르지 않습니다'))
    await expect(login('a@b.com', 'password!')).rejects.toThrow(
      '비밀번호가 올바르지 않습니다',
    )
  })
})

describe('logout', () => {
  it('posts to /auth/logout', async () => {
    mockedPost.mockResolvedValueOnce({ data: null })
    await logout()
    expect(mockedPost).toHaveBeenCalledWith('/auth/logout')
  })
})

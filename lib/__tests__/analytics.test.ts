import { describe, it, expect, vi, afterEach } from 'vitest'
import { setAdapter, track, consoleAdapter } from '../analytics'

afterEach(() => {
  setAdapter(() => {})
})

describe('analytics', () => {
  it('routes track() calls to the current adapter', () => {
    const spy = vi.fn()
    setAdapter(spy)

    track('post.detail.view', { postId: 42 })

    expect(spy).toHaveBeenCalledWith('post.detail.view', { postId: 42 })
  })

  it('swallows adapter errors so user flow is not blocked', () => {
    setAdapter(() => {
      throw new Error('sentry down')
    })

    expect(() => track('auth.login.success', { userId: 1 })).not.toThrow()
  })

  it('does nothing with the default no-op adapter', () => {
    // setAdapter는 afterEach가 noop으로 리셋하므로 따로 호출 안 함
    expect(() => track('post.list.view', {})).not.toThrow()
  })

  it('consoleAdapter logs to console', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    setAdapter(consoleAdapter)

    track('comment.create.attempt', { postId: 7 })

    expect(logSpy).toHaveBeenCalledWith('[track] comment.create.attempt', { postId: 7 })
    logSpy.mockRestore()
  })
})

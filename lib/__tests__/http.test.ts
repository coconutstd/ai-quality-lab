import { describe, it, expect } from 'vitest'
import type { AxiosError } from 'axios'
import { toFriendlyError } from '../http'

function makeAxiosError(partial: Partial<AxiosError>): AxiosError {
  return partial as AxiosError
}

describe('toFriendlyError', () => {
  it('extracts server-provided message from 4xx response', () => {
    const err = makeAxiosError({
      response: {
        status: 400,
        data: { message: '비밀번호가 올바르지 않습니다' },
      } as AxiosError['response'],
    })
    expect(toFriendlyError(err).message).toBe('비밀번호가 올바르지 않습니다')
  })

  it('falls back to "서버 오류: <status>" when response has no message', () => {
    const err = makeAxiosError({
      response: { status: 500, data: {} } as AxiosError['response'],
    })
    expect(toFriendlyError(err).message).toBe('서버 오류: 500')
  })

  it('falls back when response data is not an object', () => {
    const err = makeAxiosError({
      response: { status: 502, data: 'Bad Gateway' } as AxiosError['response'],
    })
    expect(toFriendlyError(err).message).toBe('서버 오류: 502')
  })

  it('returns network error message when request was made but no response', () => {
    const err = makeAxiosError({ request: {} })
    expect(toFriendlyError(err).message).toBe('네트워크에 연결할 수 없습니다')
  })

  it('returns the underlying error message when neither response nor request exist', () => {
    const err = makeAxiosError({ message: 'config invalid' })
    expect(toFriendlyError(err).message).toBe('config invalid')
  })

  it('returns "알 수 없는 오류" when there is no message at all', () => {
    const err = makeAxiosError({})
    expect(toFriendlyError(err).message).toBe('알 수 없는 오류')
  })
})

import axios, { AxiosError } from 'axios'

export const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  // 인증은 httpOnly 쿠키로 — 브라우저가 자동으로 동봉
  withCredentials: true,
})

function extractMessage(data: unknown, fallback: string): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as Record<string, unknown>).message === 'string'
  ) {
    return (data as { message: string }).message
  }
  return fallback
}

// 인터셉터에서 받은 AxiosError를 사용자 친화적 Error로 변환한다.
// 순수 함수로 분리해서 단위 테스트가 가능하도록.
export function toFriendlyError(error: AxiosError): Error {
  if (error.response) {
    const fallback = `서버 오류: ${error.response.status}`
    return new Error(extractMessage(error.response.data, fallback))
  }
  if (error.request) {
    return new Error('네트워크에 연결할 수 없습니다')
  }
  return new Error(error.message || '알 수 없는 오류')
}

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => Promise.reject(toFriendlyError(error)),
)

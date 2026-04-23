import { http } from './http'
import { LoginResult, LoginResultSchema } from './schemas'

// 토큰은 서버가 httpOnly 쿠키로 내려주므로 클라이언트에서 다루지 않는다
export async function login(email: string, password: string): Promise<LoginResult> {
  const { data } = await http.post<unknown>('/auth/login', { email, password })
  return LoginResultSchema.parse(data)
}

export async function logout(): Promise<void> {
  await http.post('/auth/logout')
}

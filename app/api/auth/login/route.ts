import { LoginInputSchema } from '@/lib/schemas'
import { withValidation } from '@/lib/api-route'
import { NextResponse } from 'next/server'

export const POST = withValidation(LoginInputSchema, async (data) => {
  // Mock 로그인은 어떤 비밀번호든 통과시키므로 명시적 opt-in만 허용.
  // starter/ 로 복제된 레포가 실수로 프로덕션에 노출되는 경우를 차단.
  if (process.env.MOCK_AUTH !== 'true') {
    return NextResponse.json({ message: 'not available' }, { status: 404 })
  }
  const res = NextResponse.json({
    user: { id: 1, email: data.email, name: 'you' },
  })
  res.cookies.set('session', 'mock-session', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
  return res
})

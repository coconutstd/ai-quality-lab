import { NextResponse, type NextRequest } from 'next/server'
import { LoginInputSchema } from '@/lib/schemas'

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Mock 로그인은 어떤 비밀번호든 통과시키므로 명시적 opt-in만 허용.
  // starter/ 로 복제된 레포가 실수로 프로덕션에 노출되는 경우를 차단.
  if (process.env.MOCK_AUTH !== 'true') {
    return NextResponse.json({ message: 'not available' }, { status: 404 })
  }

  const body: unknown = await req.json().catch(() => null)
  const parsed = LoginInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: '입력이 올바르지 않습니다' }, { status: 400 })
  }
  // 실제 인증 없음 — dev용. httpOnly 쿠키 세팅만 흉내.
  const res = NextResponse.json({
    user: { id: 1, email: parsed.data.email, name: 'you' },
  })
  res.cookies.set('session', 'mock-session', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })
  return res
}

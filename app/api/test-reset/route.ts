import { NextResponse } from 'next/server'
import { resetStore } from '../_store'

// 테스트 전용 리셋. NODE_ENV 기반 가드는 Vercel preview·staging 같은 "production-like"
// 환경을 위험에 빠뜨리므로 **명시적 opt-in** 플래그만 허용한다.
// 사용처: `npm run dev` 및 Playwright webServer — package.json 의 dev 스크립트가 세팅.
export async function POST(): Promise<NextResponse> {
  if (process.env.ENABLE_TEST_RESET !== 'true') {
    return NextResponse.json({ message: 'not available' }, { status: 404 })
  }
  resetStore()
  return NextResponse.json({ ok: true })
}

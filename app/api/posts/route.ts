import { NextResponse, type NextRequest } from 'next/server'
import { CreatePostInputSchema } from '@/lib/schemas'
import { createPost, listPosts } from '../_store'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(listPosts())
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body: unknown = await req.json().catch(() => null)
  const parsed = CreatePostInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: '입력이 올바르지 않습니다' },
      { status: 400 },
    )
  }
  const created = createPost({ ...parsed.data, author: 'you' })
  return NextResponse.json(created, { status: 201 })
}

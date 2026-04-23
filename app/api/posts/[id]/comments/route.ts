import { NextResponse, type NextRequest } from 'next/server'
import { CreateCommentInputSchema } from '@/lib/schemas'
import { createComment, getPost, listComments } from '../../../_store'

type RouteCtx = { params: Promise<{ id: string }> }

function parseId(raw: string): number | null {
  const n = Number(raw)
  return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : null
}

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<NextResponse> {
  const { id } = await ctx.params
  const num = parseId(id)
  if (num === null) return NextResponse.json({ message: '잘못된 id' }, { status: 400 })
  if (!getPost(num)) return NextResponse.json({ message: '없는 게시글' }, { status: 404 })
  return NextResponse.json(listComments(num))
}

export async function POST(req: NextRequest, ctx: RouteCtx): Promise<NextResponse> {
  const { id } = await ctx.params
  const num = parseId(id)
  if (num === null) return NextResponse.json({ message: '잘못된 id' }, { status: 400 })
  if (!getPost(num)) return NextResponse.json({ message: '없는 게시글' }, { status: 404 })

  const body: unknown = await req.json().catch(() => null)
  const parsed = CreateCommentInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: '입력이 올바르지 않습니다' }, { status: 400 })
  }
  const created = createComment(num, { body: parsed.data.body, author: 'you' })
  return NextResponse.json(created, { status: 201 })
}

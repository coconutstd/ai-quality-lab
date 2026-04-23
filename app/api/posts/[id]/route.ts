import { NextResponse, type NextRequest } from 'next/server'
import { UpdatePostInputSchema } from '@/lib/schemas'
import { deletePost, getPost, updatePost } from '../../_store'

type RouteCtx = { params: Promise<{ id: string }> }

function parseId(raw: string): number | null {
  const n = Number(raw)
  return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : null
}

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<NextResponse> {
  const { id } = await ctx.params
  const num = parseId(id)
  if (num === null) return NextResponse.json({ message: '잘못된 id' }, { status: 400 })
  const post = getPost(num)
  if (!post) return NextResponse.json({ message: '없는 게시글' }, { status: 404 })
  return NextResponse.json(post)
}

export async function PUT(req: NextRequest, ctx: RouteCtx): Promise<NextResponse> {
  const { id } = await ctx.params
  const num = parseId(id)
  if (num === null) return NextResponse.json({ message: '잘못된 id' }, { status: 400 })

  const body: unknown = await req.json().catch(() => null)
  const parsed = UpdatePostInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: '입력이 올바르지 않습니다' }, { status: 400 })
  }
  const updated = updatePost(num, parsed.data)
  if (!updated) return NextResponse.json({ message: '없는 게시글' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx): Promise<NextResponse> {
  const { id } = await ctx.params
  const num = parseId(id)
  if (num === null) return NextResponse.json({ message: '잘못된 id' }, { status: 400 })
  const removed = deletePost(num)
  if (!removed) return NextResponse.json({ message: '없는 게시글' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}

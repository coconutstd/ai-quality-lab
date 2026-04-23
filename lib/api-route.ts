import { NextResponse, type NextRequest } from 'next/server'
import type { ZodSchema } from 'zod'

type RouteCtx = { params: Promise<{ id: string }> }

export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (data: T, req: NextRequest) => Promise<NextResponse>,
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const body: unknown = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: '입력이 올바르지 않습니다' }, { status: 400 })
    }
    return handler(parsed.data, req)
  }
}

export function withId(
  handler: (id: number, req: NextRequest) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ctx: RouteCtx): Promise<NextResponse> => {
    const { id } = await ctx.params
    const n = Number(id)
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ message: '잘못된 id' }, { status: 400 })
    }
    return handler(n, req)
  }
}

export function withIdAndValidation<T>(
  schema: ZodSchema<T>,
  handler: (id: number, data: T, req: NextRequest) => Promise<NextResponse>,
) {
  return withId(async (id, req) => {
    const body: unknown = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: '입력이 올바르지 않습니다' }, { status: 400 })
    }
    return handler(id, parsed.data, req)
  })
}

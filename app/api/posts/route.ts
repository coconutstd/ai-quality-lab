import { NextResponse } from 'next/server'
import { CreatePostInputSchema } from '@/lib/schemas'
import { withValidation } from '@/lib/api-route'
import { createPost, listPosts } from '../_store'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(listPosts())
}

export const POST = withValidation(CreatePostInputSchema, async (data) => {
  const created = createPost({ ...data, author: 'you' })
  return NextResponse.json(created, { status: 201 })
})

import { NextResponse } from 'next/server'
import { UpdatePostInputSchema } from '@/lib/schemas'
import { withId, withIdAndValidation } from '@/lib/api-route'
import { deletePost, getPost, updatePost } from '../../_store'

export const GET = withId(async (id) => {
  const post = getPost(id)
  if (!post) return NextResponse.json({ message: '없는 게시글' }, { status: 404 })
  return NextResponse.json(post)
})

export const PUT = withIdAndValidation(UpdatePostInputSchema, async (id, data) => {
  const updated = updatePost(id, data)
  if (!updated) return NextResponse.json({ message: '없는 게시글' }, { status: 404 })
  return NextResponse.json(updated)
})

export const DELETE = withId(async (id) => {
  const removed = deletePost(id)
  if (!removed) return NextResponse.json({ message: '없는 게시글' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
})

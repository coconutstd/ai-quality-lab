import { NextResponse } from 'next/server'
import { CreateCommentInputSchema } from '@/lib/schemas'
import { withId, withIdAndValidation } from '@/lib/api-route'
import { createComment, getPost, listComments } from '../../../_store'

export const GET = withId(async (id) => {
  if (!getPost(id)) return NextResponse.json({ message: '없는 게시글' }, { status: 404 })
  return NextResponse.json(listComments(id))
})

export const POST = withIdAndValidation(CreateCommentInputSchema, async (id, data) => {
  if (!getPost(id)) return NextResponse.json({ message: '없는 게시글' }, { status: 404 })
  const created = createComment(id, { body: data.body, author: 'you' })
  return NextResponse.json(created, { status: 201 })
})

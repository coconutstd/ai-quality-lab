import { describe, it, expect } from 'vitest'
import {
  PostSchema,
  PostListSchema,
  UserSchema,
  LoginInputSchema,
  LoginResultSchema,
  CommentSchema,
  CommentListSchema,
  CreatePostInputSchema,
  CreateCommentInputSchema,
} from '../schemas'

describe('PostSchema', () => {
  const valid = { id: 1, title: 'hi', content: 'body', author: 'alice' }

  it('accepts a well-formed post', () => {
    expect(PostSchema.parse(valid)).toEqual(valid)
  })

  it('rejects a post with non-numeric id', () => {
    expect(() => PostSchema.parse({ ...valid, id: '1' })).toThrow()
  })

  it('rejects a post missing title', () => {
    const rest = { id: valid.id, content: valid.content, author: valid.author }
    expect(() => PostSchema.parse(rest)).toThrow()
  })

  it('rejects null', () => {
    expect(() => PostSchema.parse(null)).toThrow()
  })
})

describe('PostListSchema', () => {
  it('accepts an empty array', () => {
    expect(PostListSchema.parse([])).toEqual([])
  })

  it('rejects an array with one invalid post', () => {
    const ok = { id: 1, title: 'a', content: 'b', author: 'c' }
    expect(() => PostListSchema.parse([ok, { id: 'bad' }])).toThrow()
  })
})

describe('UserSchema', () => {
  it('rejects malformed email', () => {
    expect(() =>
      UserSchema.parse({ id: 1, email: 'not-an-email', name: 'a' }),
    ).toThrow()
  })
})

describe('LoginInputSchema', () => {
  it('accepts valid email and 8+ char password', () => {
    const r = LoginInputSchema.safeParse({
      email: 'a@b.com',
      password: '12345678',
    })
    expect(r.success).toBe(true)
  })

  it('returns Korean error for invalid email', () => {
    const r = LoginInputSchema.safeParse({ email: 'nope', password: '12345678' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('올바른 이메일 형식이 아닙니다')
    }
  })

  it('returns Korean error for short password', () => {
    const r = LoginInputSchema.safeParse({ email: 'a@b.com', password: '123' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('비밀번호는 8자 이상이어야 합니다')
    }
  })
})

describe('CommentSchema', () => {
  const valid = { id: 1, postId: 10, author: 'alice', body: 'hi' }

  it('accepts a valid comment', () => {
    expect(CommentSchema.parse(valid)).toEqual(valid)
  })

  it('rejects when postId is missing', () => {
    const rest = { id: valid.id, author: valid.author, body: valid.body }
    expect(() => CommentSchema.parse(rest)).toThrow()
  })
})

describe('CommentListSchema', () => {
  it('accepts an empty array', () => {
    expect(CommentListSchema.parse([])).toEqual([])
  })

  it('rejects an array with one invalid comment', () => {
    const ok = { id: 1, postId: 1, author: 'a', body: 'b' }
    expect(() => CommentListSchema.parse([ok, { id: 'bad' }])).toThrow()
  })
})

describe('CreatePostInputSchema', () => {
  it('accepts valid title and content', () => {
    const r = CreatePostInputSchema.safeParse({ title: 't', content: 'c' })
    expect(r.success).toBe(true)
  })

  it('rejects empty title', () => {
    const r = CreatePostInputSchema.safeParse({ title: '', content: 'c' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('제목을 입력하세요')
    }
  })

  it('rejects title over 120 chars', () => {
    const r = CreatePostInputSchema.safeParse({
      title: 'x'.repeat(121),
      content: 'c',
    })
    expect(r.success).toBe(false)
  })

  it('rejects empty content', () => {
    const r = CreatePostInputSchema.safeParse({ title: 't', content: '' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('본문을 입력하세요')
    }
  })
})

describe('CreateCommentInputSchema', () => {
  it('accepts non-empty body within 1000 chars', () => {
    const r = CreateCommentInputSchema.safeParse({ body: 'hi' })
    expect(r.success).toBe(true)
  })

  it('rejects empty body', () => {
    const r = CreateCommentInputSchema.safeParse({ body: '' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues[0]?.message).toBe('댓글을 입력하세요')
    }
  })

  it('rejects body over 1000 chars', () => {
    const r = CreateCommentInputSchema.safeParse({ body: 'x'.repeat(1001) })
    expect(r.success).toBe(false)
  })
})

describe('LoginResultSchema', () => {
  it('does not expose a token field on the type or runtime', () => {
    const data = {
      user: { id: 1, email: 'a@b.com', name: 'A' },
      token: 'should-be-stripped-or-ignored',
    }
    const result = LoginResultSchema.parse(data)
    // 스키마에 token이 없으므로 런타임 결과에도 token 키가 없어야 함
    expect(result).not.toHaveProperty('token')
    expect(result.user.email).toBe('a@b.com')
  })
})

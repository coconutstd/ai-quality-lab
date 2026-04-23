import { z } from 'zod'
import { t } from './i18n'

// 도메인 엔티티 — 응답 검증 + 타입 추론을 동시에 담당
export const PostSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  content: z.string(),
  author: z.string(),
})

export const PostListSchema = z.array(PostSchema)

export const CommentSchema = z.object({
  id: z.number().int(),
  postId: z.number().int(),
  author: z.string(),
  body: z.string(),
})

export const CommentListSchema = z.array(CommentSchema)

export const UserSchema = z.object({
  id: z.number().int(),
  email: z.email(),
  name: z.string(),
})

export const LoginResultSchema = z.object({
  user: UserSchema,
})

// 폼 입력 — 메시지는 i18n 키 경유
// 메시지는 모듈 로드 시점에 현재 locale로 평가됨
// (런타임 locale 변경 시에는 페이지 reload가 필요 — lab 범위에서는 충분)
export const LoginInputSchema = z.object({
  email: z.email({ message: t('login.error.invalidEmail') }),
  password: z.string().min(8, t('login.error.shortPassword')),
})

export const CreatePostInputSchema = z.object({
  title: z
    .string()
    .min(1, t('post.new.error.titleRequired'))
    .max(120, t('post.new.error.titleTooLong')),
  content: z.string().min(1, t('post.new.error.contentRequired')),
})

export const CreateCommentInputSchema = z.object({
  body: z
    .string()
    .min(1, t('comment.error.bodyRequired'))
    .max(1000, t('comment.error.bodyTooLong')),
})

export type Post = z.infer<typeof PostSchema>
export type Comment = z.infer<typeof CommentSchema>
export type User = z.infer<typeof UserSchema>
export type LoginResult = z.infer<typeof LoginResultSchema>
export type LoginInput = z.infer<typeof LoginInputSchema>
export type CreatePostInput = z.infer<typeof CreatePostInputSchema>
export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>

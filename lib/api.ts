import { http } from './http'
import {
  Comment,
  CommentListSchema,
  CommentSchema,
  Post,
  PostListSchema,
  PostSchema,
} from './schemas'

export async function fetchPosts(): Promise<Post[]> {
  const { data } = await http.get<unknown>('/posts')
  return PostListSchema.parse(data)
}

export async function fetchPost(id: number): Promise<Post> {
  const { data } = await http.get<unknown>(`/posts/${id}`)
  return PostSchema.parse(data)
}

export async function createPost(title: string, content: string): Promise<Post> {
  const { data } = await http.post<unknown>('/posts', { title, content })
  return PostSchema.parse(data)
}

export async function updatePost(
  id: number,
  input: { title: string; content: string },
): Promise<Post> {
  const { data } = await http.put<unknown>(`/posts/${id}`, input)
  return PostSchema.parse(data)
}

export async function deletePost(id: number): Promise<void> {
  await http.delete(`/posts/${id}`)
}

export async function fetchComments(postId: number): Promise<Comment[]> {
  const { data } = await http.get<unknown>(`/posts/${postId}/comments`)
  return CommentListSchema.parse(data)
}

export async function createComment(postId: number, body: string): Promise<Comment> {
  const { data } = await http.post<unknown>(`/posts/${postId}/comments`, { body })
  return CommentSchema.parse(data)
}

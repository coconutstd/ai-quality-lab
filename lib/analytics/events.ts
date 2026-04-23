// 이벤트별 properties shape — 잘못된 키/누락은 컴파일 에러
export interface EventMap {
  // PII 보호: 원본 email 대신 도메인만 (분포 분석용, 사용자 식별 불가)
  'auth.login.attempt': { emailDomain: string }
  'auth.login.success': { userId: number }
  'auth.login.failure': { reason: string }

  'post.list.view': Record<string, never>
  'post.detail.view': { postId: number }

  'post.create.attempt': Record<string, never>
  'post.create.success': { postId: number }
  'post.create.failure': { reason: string }

  'post.delete.attempt': { postId: number }
  'post.delete.success': { postId: number }
  'post.delete.failure': { postId: number; reason: string }

  'comment.list.view': { postId: number }
  'comment.create.attempt': { postId: number }
  'comment.create.success': { postId: number; commentId: number }
  'comment.create.failure': { postId: number; reason: string }

  'alert.dismiss.click': { id: string; variant: 'info' | 'success' | 'warning' | 'error' }
}

export type EventName = keyof EventMap

export const ko = {
  // common
  'common.loading': '로딩 중...',
  'common.error': '오류: {message}',
  'common.unknownError': '알 수 없는 오류',

  // login
  'login.title': '로그인',
  'login.label.email': '이메일',
  'login.label.password': '비밀번호',
  'login.button.submit': '로그인',
  'login.button.submitting': '로그인 중...',
  'login.error.invalidEmail': '올바른 이메일 형식이 아닙니다',
  'login.error.shortPassword': '비밀번호는 8자 이상이어야 합니다',

  // post (list)
  'post.list.title': '게시글 목록',
  'post.list.newLink': '새 글 작성',
  'post.list.deleteAria': '"{title}" 삭제',
  'post.list.deleteButton': '삭제',
  'post.list.deletingButton': '삭제 중...',
  'post.list.deleteError': '삭제 오류: {message}',

  // post (new)
  'post.new.title': '새 글 작성',
  'post.new.label.title': '제목',
  'post.new.label.content': '본문',
  'post.new.button.submit': '저장',
  'post.new.button.submitting': '저장 중...',
  'post.new.error.titleRequired': '제목을 입력하세요',
  'post.new.error.titleTooLong': '제목은 120자 이하여야 합니다',
  'post.new.error.contentRequired': '본문을 입력하세요',

  // post (detail)
  'post.detail.author': '작성자: {author}',

  // comment
  'comment.section.title': '댓글',
  'comment.section.label': '댓글',
  'comment.empty': '아직 댓글이 없습니다.',
  'comment.loading': '댓글 로딩 중...',
  'comment.error': '댓글 오류: {message}',
  'comment.label.body': '댓글 입력',
  'comment.placeholder': '댓글을 입력하세요',
  'comment.button.submit': '댓글 작성',
  'comment.button.submitting': '작성 중...',
  'comment.error.bodyRequired': '댓글을 입력하세요',
  'comment.error.bodyTooLong': '댓글은 1000자 이하여야 합니다',

  // alert (shared component)
  'alert.button.dismiss': '닫기',

  // confirm dialog (shared component)
  'confirm.button.confirm': '확인',
  'confirm.button.cancel': '취소',
  'confirm.default.title': '확인이 필요합니다',
  'confirm.default.message': '이 작업을 진행하시겠습니까?',

  // post edit
  'post.edit.title': '글 수정',
  'post.edit.button.submit': '수정 저장',
  'post.edit.button.submitting': '저장 중...',
  'post.edit.error.titleRequired': '제목을 입력하세요',
  'post.edit.error.titleTooLong': '제목은 120자 이하여야 합니다',
  'post.edit.error.contentRequired': '본문을 입력하세요',

  // post detail — edit/delete entry points
  'post.detail.editLink': '수정',
  'post.detail.deleteButton': '삭제',
  'post.detail.deleteConfirmTitle': '게시글 삭제',
  'post.detail.deleteConfirmMessage': '"{title}" 글을 삭제합니다. 되돌릴 수 없습니다.',
  'post.list.deleteConfirmTitle': '게시글 삭제',
  'post.list.deleteConfirmMessage': '"{title}" 글을 삭제합니다. 되돌릴 수 없습니다.',

  // network / auth
  'http.serverError': '서버 오류: {status}',
  'http.networkError': '네트워크에 연결할 수 없습니다',
  'auth.loginGenericError': '로그인에 실패했습니다',
} as const

export const en: Record<keyof typeof ko, string> = {
  'common.loading': 'Loading...',
  'common.error': 'Error: {message}',
  'common.unknownError': 'Unknown error',

  'login.title': 'Sign in',
  'login.label.email': 'Email',
  'login.label.password': 'Password',
  'login.button.submit': 'Sign in',
  'login.button.submitting': 'Signing in...',
  'login.error.invalidEmail': 'Please enter a valid email address',
  'login.error.shortPassword': 'Password must be at least 8 characters',

  'post.list.title': 'Posts',
  'post.list.newLink': 'New post',
  'post.list.deleteAria': 'Delete "{title}"',
  'post.list.deleteButton': 'Delete',
  'post.list.deletingButton': 'Deleting...',
  'post.list.deleteError': 'Delete error: {message}',

  'post.new.title': 'New post',
  'post.new.label.title': 'Title',
  'post.new.label.content': 'Content',
  'post.new.button.submit': 'Save',
  'post.new.button.submitting': 'Saving...',
  'post.new.error.titleRequired': 'Title is required',
  'post.new.error.titleTooLong': 'Title must be 120 characters or fewer',
  'post.new.error.contentRequired': 'Content is required',

  'post.detail.author': 'Author: {author}',

  'comment.section.title': 'Comments',
  'comment.section.label': 'Comments',
  'comment.empty': 'No comments yet.',
  'comment.loading': 'Loading comments...',
  'comment.error': 'Comment error: {message}',
  'comment.label.body': 'Comment input',
  'comment.placeholder': 'Write a comment',
  'comment.button.submit': 'Post comment',
  'comment.button.submitting': 'Posting...',
  'comment.error.bodyRequired': 'Comment is required',
  'comment.error.bodyTooLong': 'Comment must be 1000 characters or fewer',

  'alert.button.dismiss': 'Dismiss',

  'confirm.button.confirm': 'Confirm',
  'confirm.button.cancel': 'Cancel',
  'confirm.default.title': 'Please confirm',
  'confirm.default.message': 'Do you want to proceed?',

  'post.edit.title': 'Edit post',
  'post.edit.button.submit': 'Save changes',
  'post.edit.button.submitting': 'Saving...',
  'post.edit.error.titleRequired': 'Title is required',
  'post.edit.error.titleTooLong': 'Title must be 120 characters or fewer',
  'post.edit.error.contentRequired': 'Content is required',

  'post.detail.editLink': 'Edit',
  'post.detail.deleteButton': 'Delete',
  'post.detail.deleteConfirmTitle': 'Delete post',
  'post.detail.deleteConfirmMessage': 'Delete "{title}". This cannot be undone.',
  'post.list.deleteConfirmTitle': 'Delete post',
  'post.list.deleteConfirmMessage': 'Delete "{title}". This cannot be undone.',

  'http.serverError': 'Server error: {status}',
  'http.networkError': 'Cannot connect to network',
  'auth.loginGenericError': 'Sign-in failed',
}

export type MessageKey = keyof typeof ko
export type Locale = 'ko' | 'en'
export const messages = { ko, en } satisfies Record<Locale, Record<MessageKey, string>>

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ request }) => {
  const res = await request.post('/api/test-reset')
  if (!res.ok()) throw new Error(`reset failed: ${res.status()}`)
})

test('posts 목록 진입 시 시드된 3건이 404 없이 렌더된다 — 단위 테스트가 놓친 실패 감지', async ({ page }) => {
  await page.goto('/posts')
  await expect(page.getByRole('heading', { name: /The Posts, collected\./ })).toBeVisible()
  await expect(page.getByRole('link', { name: /첫 번째 게시글/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /하네스 관측 일지/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /파괴적 작업에는 확인을/ })).toBeVisible()
})

test('목록에서 상세로 진입 시 SafeHtml 본문과 댓글이 로드된다', async ({ page }) => {
  await page.goto('/posts')
  await page.getByRole('link', { name: /첫 번째 게시글/ }).click()
  await expect(page).toHaveURL(/\/posts\/1$/)
  await expect(page.getByRole('heading', { name: '첫 번째 게시글' })).toBeVisible()
  await expect(page.getByText('Author')).toBeVisible()
  await expect(page.getByText('alice', { exact: true })).toBeVisible()
  await expect(page.getByText('반갑습니다!')).toBeVisible()
  await expect(page.getByText('첫 댓글 테스트.')).toBeVisible()
})

test('상세에서 편집 → 저장 → 변경이 목록에도 반영된다', async ({ page }) => {
  await page.goto('/posts/2')
  await page.getByRole('link', { name: '수정' }).click()
  await expect(page).toHaveURL(/\/posts\/2\/edit$/)
  await expect(page.getByRole('heading', { name: /Press revisions\./ })).toBeVisible()

  const newTitle = `E2E 수정된 제목 ${Date.now()}`
  const titleInput = page.getByLabel('제목')
  await titleInput.fill(newTitle)
  await page.getByRole('button', { name: '수정 저장' }).click()

  // 저장 후 상세로 이동하며 새 제목이 보인다
  await expect(page).toHaveURL(/\/posts\/2$/)
  await expect(page.getByRole('heading', { name: newTitle })).toBeVisible()

  // 목록에도 새 제목이 반영된다
  await page.goto('/posts')
  await expect(page.getByRole('link', { name: newTitle })).toBeVisible()
})

test('삭제 버튼 → ConfirmDialog 확인 → 목록에서 제거된다 (파괴적 작업 확인 플로우)', async ({
  page,
}) => {
  await page.goto('/posts')
  const targetLink = page.getByRole('link', { name: '파괴적 작업에는 확인을' })
  await expect(targetLink).toBeVisible()

  await page
    .getByRole('button', { name: '"파괴적 작업에는 확인을" 삭제' })
    .click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog.getByRole('heading', { name: '게시글 삭제' })).toBeVisible()

  // 확인 버튼에 초기 포커스가 와 있어야 한다
  await expect(dialog.getByRole('button', { name: '삭제' })).toBeFocused()
  await dialog.getByRole('button', { name: '삭제' }).click()

  await expect(dialog).toBeHidden()
  await expect(targetLink).toBeHidden()
})

test('삭제 ConfirmDialog에서 ESC를 누르면 삭제가 취소된다', async ({ page }) => {
  await page.goto('/posts')
  const targetLink = page.getByRole('link', { name: '하네스 관측 일지' })
  await expect(targetLink).toBeVisible()
  await page
    .getByRole('button', { name: '"하네스 관측 일지" 삭제' })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(targetLink).toBeVisible()
})

import { expect, test, type Page } from '@playwright/test'

const testerAccount = {
  username: 'banlin.huang',
  password: 'Yijing@2026',
}

const reviewerAccount = {
  username: 'review.expert',
  password: 'Review@2026',
}

const adminAccount = {
  username: 'admin.root',
  password: 'Admin@2026',
}

async function resetSession(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    window.sessionStorage.clear()
    window.localStorage.clear()
  })
  await page.goto('/')
  await expect(page.getByTestId('login-username-input')).toBeVisible()
}

async function loginAs(page: Page, credentials: { username: string; password: string }) {
  await resetSession(page)
  await page.getByTestId('login-username-input').fill(credentials.username)
  await page.getByTestId('login-password-input').fill(credentials.password)
  await page.getByTestId('login-submit-button').click()
  await expect(page.getByTestId('sidebar-item-workbench')).toBeVisible()
}

test.describe.serial('亿境测试部浏览器主链路回归', () => {
  test('covers login, draft generation, review, export, and audit logs', async ({ page }) => {
    const caseTitle = `浏览器回归用例 ${Date.now()}`

    await loginAs(page, testerAccount)
    await page.getByTestId('draft-title-input').fill(caseTitle)
    await page.getByTestId('draft-requirement-input').fill('验证浏览器自动化回归脚本、审核链路和导出任务都可以正常工作。')
    await page.getByTestId('generate-draft-button').click()

    await expect(page.getByTestId('inline-editor-title-input')).toHaveValue(caseTitle)
    await page.getByTestId('inline-editor-status-select').selectOption({ label: '待审核' })
    await page.waitForTimeout(1200)

    await loginAs(page, reviewerAccount)
    await page.getByTestId('sidebar-item-review').click()
    await expect(page.getByTestId('review-segment-pending')).toBeVisible()
    await page.locator('[data-testid^="review-case-"]').filter({ hasText: caseTitle }).first().click()
    await page.getByTestId('review-comment-input').fill('浏览器回归已覆盖，允许通过。')
    await page.getByTestId('review-approve-button').click()
    await page.getByRole('button', { name: '确认通过' }).click()
    await expect(page.getByTestId('review-segment-processed')).toBeVisible()
    await page.getByTestId('review-segment-processed').click()
    await expect(page.locator('[data-testid^="review-case-"]').filter({ hasText: caseTitle }).first()).toBeVisible()

    await loginAs(page, adminAccount)
    await page.getByTestId('sidebar-item-export').click()
    await page.getByTestId('export-keyword-input').fill(caseTitle)
    await page.getByTestId('export-start-button').click()
    await expect(page.getByTestId('export-status-success')).toBeVisible()

    await page.getByTestId('sidebar-item-audit').click()
    await expect(page.getByTestId('audit-search-input')).toBeVisible()
    await page.getByTestId('audit-search-input').fill(caseTitle)
    await expect(page.getByTestId('audit-detail-panel')).toContainText(caseTitle)
  })
})

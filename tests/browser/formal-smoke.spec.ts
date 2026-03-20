import { expect, test, type Page } from '@playwright/test'

const username = (process.env.FORMAL_BROWSER_USERNAME ?? process.env.FORMAL_API_USERNAME ?? '').trim()
const password = process.env.FORMAL_BROWSER_PASSWORD ?? process.env.FORMAL_API_PASSWORD ?? ''
const adminUsername = (process.env.FORMAL_BROWSER_ADMIN_USERNAME ?? process.env.FORMAL_API_ADMIN_USERNAME ?? '').trim()
const adminPassword = process.env.FORMAL_BROWSER_ADMIN_PASSWORD ?? process.env.FORMAL_API_ADMIN_PASSWORD ?? ''
const smokeKeyword = (process.env.FORMAL_BROWSER_KEYWORD ?? '').trim()

test.describe.serial('正式后端只读浏览器 smoke', () => {
  test.skip(!username || !password, '需要提供 FORMAL_BROWSER_USERNAME / FORMAL_BROWSER_PASSWORD 或 FORMAL_API_* 环境变量。')

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

  test('covers readonly login and navigation against the formal backend', async ({ page }) => {
    await loginAs(page, { username, password })

    await expect(page.getByTestId('workbench-search-input')).toBeVisible()
    if (smokeKeyword) {
      await page.getByTestId('workbench-search-input').fill(smokeKeyword)
    }

    await page.getByTestId('sidebar-item-review').click()
    await expect(page.getByTestId('review-search-input')).toBeVisible()

    await page.getByTestId('sidebar-item-export').click()
    await expect(page.getByTestId('export-keyword-input')).toBeVisible()
    if (smokeKeyword) {
      await page.getByTestId('export-keyword-input').fill(smokeKeyword)
    }

    await page.getByTestId('sidebar-item-knowledge').click()
    await expect(page.getByText('知识基线')).toBeVisible()

    if (adminUsername && adminPassword) {
      await loginAs(page, { username: adminUsername, password: adminPassword })
      await page.getByTestId('sidebar-item-audit').click()
      await expect(page.getByTestId('audit-search-input')).toBeVisible()
      if (smokeKeyword) {
        await page.getByTestId('audit-search-input').fill(smokeKeyword)
      }
    }
  })
})

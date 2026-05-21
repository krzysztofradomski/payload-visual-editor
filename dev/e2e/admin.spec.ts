import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth.js'

test.describe('admin', () => {
  test('logs in and shows the dashboard', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin')

    await expect(page).toHaveTitle(/Dashboard/)
    await expect(page.locator('.graphic-icon')).toBeVisible()
  })
})

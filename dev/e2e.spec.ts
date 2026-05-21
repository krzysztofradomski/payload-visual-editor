import { expect, test } from '@playwright/test'

test('should render admin panel logo', async ({ page }) => {
  await page.goto('/admin')

  await page.fill('#field-email', 'test@test.com')
  await page.fill('#field-password', 'test1234')
  await page.click('.form-submit button')

  await expect(page).toHaveTitle(/Dashboard/)
  await expect(page.locator('.graphic-icon')).toBeVisible()
})

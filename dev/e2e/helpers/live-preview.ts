import type { FrameLocator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

import { loginAsAdmin } from './auth.js'

export const SEED_POST_TITLE = 'Welcome to the visual editor demo'
export const SEED_POST_SLUG = 'hello-world'

export function getPreviewFrame(page: Page): FrameLocator {
  return page.frameLocator('#live-preview-iframe')
}

async function getSeedPostId(page: Page): Promise<string> {
  const token = await loginAsAdmin(page)
  const response = await page.request.get(
    `/api/posts?where[slug][equals]=${SEED_POST_SLUG}&limit=1&depth=0`,
    {
      headers: { Authorization: `JWT ${token}` },
    },
  )

  expect(response.ok()).toBeTruthy()

  const json = (await response.json()) as { docs: { id: string }[] }
  const postId = json.docs[0]?.id

  expect(postId).toBeTruthy()

  return postId!
}

export async function openSeedPostEditor(page: Page) {
  const postId = await getSeedPostId(page)

  await page.goto(`/admin/collections/posts/${postId}`)
  await expect(page.locator('#field-title')).toBeVisible()
}

export async function enableLivePreview(page: Page) {
  const toggler = page.locator('#live-preview-toggler')
  await expect(toggler).toBeVisible()

  const isActive = await toggler.evaluate((el) =>
    el.classList.contains('live-preview-toggler--active'),
  )

  if (!isActive) {
    await toggler.click()
  }

  const iframe = page.locator('#live-preview-iframe')
  await expect(iframe).toHaveAttribute('src', /payloadLivePreview=true/, { timeout: 15_000 })
  await expect(iframe).not.toHaveClass(/is-loading/, { timeout: 15_000 })
  await expect(page.locator('.live-preview-toolbar')).toBeAttached()
}

export async function waitForPreviewContent(page: Page, title?: string) {
  const frame = getPreviewFrame(page)
  const expectedTitle =
    title ?? ((await page.locator('#field-title').inputValue()) || SEED_POST_TITLE)

  await expect(frame.locator('h1')).toHaveText(expectedTitle, { timeout: 15_000 })
}

export async function enterVisualEditMode(page: Page) {
  const editButton = page.locator('.payload-plugin-visual-editor-toggle')
  await expect(editButton).toBeVisible()
  await expect(editButton).toHaveText('Edit')
  await editButton.click()
  await expect(editButton).toHaveText('Done')
  await expect(page.locator('.payload-plugin-visual-editor-hint')).toBeVisible()
}

export async function exitVisualEditMode(page: Page) {
  const editButton = page.locator('.payload-plugin-visual-editor-toggle')
  await editButton.click()
  await expect(editButton).toHaveText('Edit')
}

import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/auth.js'
import {
  enableLivePreview,
  enterVisualEditMode,
  exitVisualEditMode,
  getPreviewFrame,
  openSeedPostEditor,
  waitForPreviewContent,
} from './helpers/live-preview.js'

test.describe('visual editor', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test.describe.configure({ mode: 'serial' })

  test('exposes editable fields for enabled collections', async ({ page }) => {
    const response = await page.request.get('/api/visual-editor/fields?collection=posts')

    expect(response.ok()).toBeTruthy()

    const body = (await response.json()) as {
      collection: string
      fields: { path: string; type: string }[]
    }

    expect(body.collection).toBe('posts')
    expect(body.fields).toEqual(
      expect.arrayContaining([
        { type: 'text', path: 'title' },
        { type: 'textarea', path: 'excerpt' },
        { type: 'number', path: 'views' },
        { type: 'richText', path: 'content' },
      ]),
    )
  })

  test('shows the Edit control when live preview is active', async ({ page }) => {
    await openSeedPostEditor(page)
    await enableLivePreview(page)
    await waitForPreviewContent(page)

    const editButton = page.locator('.payload-plugin-visual-editor-toggle')
    await expect(editButton).toBeVisible()
    await expect(editButton).toHaveText('Edit')
  })

  test('stamps editable fields and syncs title edits to the admin form', async ({ page }) => {
    await openSeedPostEditor(page)
    const updatedTitle = `E2E title ${Date.now()}`

    await enableLivePreview(page)
    await waitForPreviewContent(page)
    await enterVisualEditMode(page)

    const frame = getPreviewFrame(page)
    const titleField = frame.locator('[data-ve-path="title"]')

    await expect(titleField).toBeAttached({ timeout: 15_000 })
    await expect(titleField).toHaveAttribute('contenteditable', 'true')

    await titleField.click()
    await titleField.fill(updatedTitle)

    await expect(page.locator('#field-title')).toHaveValue(updatedTitle, { timeout: 5000 })
    await expect(frame.locator('h1')).toHaveText(updatedTitle)

    await exitVisualEditMode(page)
    await expect(titleField).not.toHaveAttribute('contenteditable', 'true')
  })

  test('syncs excerpt edits from the preview to the admin form', async ({ page }) => {
    await openSeedPostEditor(page)
    const updatedExcerpt = `E2E excerpt ${Date.now()}`

    await enableLivePreview(page)
    await waitForPreviewContent(page)
    await enterVisualEditMode(page)

    const frame = getPreviewFrame(page)
    const excerptField = frame.locator('[data-ve-path="excerpt"]')

    await expect(excerptField).toBeAttached({ timeout: 15_000 })
    await excerptField.click()
    await excerptField.fill(updatedExcerpt)

    await expect(page.locator('#field-excerpt')).toHaveValue(updatedExcerpt, { timeout: 5000 })
  })

  test('reverts preview text when pressing Escape', async ({ page }) => {
    await openSeedPostEditor(page)

    const originalTitle = await page.locator('#field-title').inputValue()

    await enableLivePreview(page)
    await waitForPreviewContent(page)
    await enterVisualEditMode(page)

    const frame = getPreviewFrame(page)
    const titleField = frame.locator('[data-ve-path="title"]')

    await titleField.click()
    await titleField.fill('Temporary e2e title')

    await titleField.press('Escape')
    await expect(titleField).toHaveText(originalTitle)
    await expect(page.locator('#field-title')).toHaveValue(originalTitle)
  })
})

import { expect, type Page } from '@playwright/test'

import { devUser } from '../../helpers/credentials.js'

export async function loginAsAdmin(page: Page): Promise<string> {
  const response = await page.request.post('/api/users/login', {
    data: {
      email: devUser.email,
      password: devUser.password,
    },
  })

  expect(response.ok()).toBeTruthy()

  const json = (await response.json()) as { token: string }
  return json.token
}

import { expect, test } from '@playwright/test'

import { E2E_EVENT } from './event'

test('the cover shows the published event and leads to the form', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText(E2E_EVENT.venueName)).toBeVisible()

  await page.getByRole('link', { name: 'Open Invitation' }).click()

  await expect(page).toHaveURL('/regist')
  await expect(page.getByLabel('Full Name')).toBeVisible()
})

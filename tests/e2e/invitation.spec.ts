import { expect, test } from '@playwright/test'

import { E2E_EVENT, E2E_NOTE } from './event'

test('the cover shows the published event and leads to the form', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText(E2E_EVENT.venueName)).toBeVisible()

  // The committee's note comes from events.details, not from the code.
  await expect(page.getByText(E2E_NOTE.value)).toBeVisible()

  await page.getByRole('link', { name: 'Open Invitation' }).click()

  await expect(page).toHaveURL('/regist')
  await expect(page.getByLabel('Full Name')).toBeVisible()
})

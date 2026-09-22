import { expect, test } from '@playwright/test'

const ticketCases = [
  ['a well-formed ticket link that matches no registration', `/t/${'x'.repeat(24)}`],
  ['a malformed ticket link', '/t/not-a-token'],
] as const

for (const [description, url] of ticketCases) {
  test(`${description} offers the form instead`, async ({ page }) => {
    const response = await page.goto(url)

    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Ticket not found' })).toBeVisible()

    await page.getByRole('link', { name: 'Register' }).click()

    await expect(page).toHaveURL('/regist')
  })
}

test('an address that does not exist shows the branded not-found page', async ({ page }) => {
  const response = await page.goto('/no-such-page')

  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()

  await page.getByRole('link', { name: 'Back to invitation' }).click()

  await expect(page).toHaveURL('/')
})

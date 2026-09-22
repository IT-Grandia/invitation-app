import { expect, test, type Page } from '@playwright/test'

// Unique per call, so a rerun against the same event is never refused as a
// duplicate number.
function uniquePhone() {
  const random = String(Math.floor(Math.random() * 100)).padStart(2, '0')
  return `0812${String(Date.now()).slice(-6)}${random}`
}

async function fillForm(page: Page, fullName: string, attending: 'Yes' | 'No') {
  await page.getByLabel('Full Name').fill(fullName)
  await page.getByLabel('WhatsApp Number').fill(uniquePhone())
  // The choices are clickable labels with no input behind them, so they are
  // found by their text.
  await page.getByText('Club 79', { exact: true }).click()
  await page.getByText('Gold', { exact: true }).click()
  await page.getByText(attending, { exact: true }).click()
}

test('a participant who will attend gets a ticket with a QR code', async ({ page }) => {
  await page.goto('/regist')
  await fillForm(page, 'Rafi Pratama', 'Yes')
  await page.getByRole('button', { name: 'RSVP', exact: true }).click()

  await expect(page).toHaveURL(/\/t\/[A-Za-z0-9_-]{24}$/)
  await expect(page.getByRole('heading', { name: 'Thank you for your registration' })).toBeVisible()
  await expect(page.getByRole('img', { name: /^QR code for ticket/ })).toBeVisible()

  // The ticket cookie turns the cover's button into a way back to the ticket.
  await page.goto('/')
  await page.getByRole('link', { name: 'View Your Ticket' }).click()

  await expect(page.getByRole('heading', { name: 'Thank you for your registration' })).toBeVisible()
})

test('a participant who will not attend is recorded without a QR code', async ({ page }) => {
  await page.goto('/regist')
  await fillForm(page, 'Nadia Putri', 'No')
  await page.getByRole('button', { name: 'SUBMIT CONFIRMATION' }).click()

  await expect(page).toHaveURL('/')

  await page.getByRole('link', { name: 'View Your Ticket' }).click()

  await expect(
    page.getByRole('heading', { name: 'Thank you for letting us know' }),
  ).toBeVisible()
  await expect(page.getByRole('img', { name: /^QR code/ })).toHaveCount(0)
})

test('an empty form is refused before anything is sent', async ({ page }) => {
  await page.goto('/regist')
  await page.getByRole('button', { name: 'RSVP', exact: true }).click()

  await expect(page.getByText('Name must be at least 3 characters.')).toBeVisible()
  await expect(page.getByText('Please select 1 community.')).toBeVisible()
  await expect(page).toHaveURL('/regist')
})

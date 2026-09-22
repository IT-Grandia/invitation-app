import { expect, test, type Page } from '@playwright/test'

import { E2E_EVENT } from './event'
import { E2E_STAFF_KEY } from './staff'

// Unique per call, so a rerun against the same event is never refused as a
// duplicate number.
function uniquePhone() {
  const random = String(Math.floor(Math.random() * 100)).padStart(2, '0')
  return `0813${String(Date.now()).slice(-6)}${random}`
}

// Through the endpoint the form posts to, so the scanner meets the participant
// exactly as a real registration leaves them.
async function registerParticipant(page: Page, fullName: string) {
  const response = await page.request.post('/api/register', {
    data: {
      fullName,
      phone: uniquePhone(),
      community: 'Club 79',
      investmentInstruments: ['Gold'],
      attending: true,
      consent: true,
      turnstileToken: 'e2e',
    },
  })

  expect(response.status()).toBe(201)

  const { token } = (await response.json()) as { token: string }
  return token
}

async function signIn(page: Page, code: string) {
  await page.goto('/scan')
  await page.getByLabel('Kode petugas').fill(code)
  await page.getByRole('button', { name: 'Masuk' }).click()
}

test('a wrong staff code is refused', async ({ page }) => {
  await signIn(page, 'not-the-staff-code')

  // By text, not role: Next's route announcer is an alert too.
  await expect(page.getByText('Kode petugas tidak dikenali.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cari Manual' })).toHaveCount(0)
})

test('an officer checks a participant in by name', async ({ page }) => {
  const token = await registerParticipant(page, 'Sari Wulandari')

  await signIn(page, E2E_STAFF_KEY)
  await expect(page.getByText(E2E_EVENT.name)).toBeVisible()

  await page.getByRole('button', { name: 'Cari Manual' }).click()
  await page.getByLabel('Nama peserta atau nomor tiket').fill('Sari Wul')

  const row = page.getByRole('listitem').filter({ hasText: 'Sari Wulandari' })
  await row.getByRole('button', { name: 'Check-in' }).click()

  // The officer matches the name to the person at the desk before confirming.
  await page.getByRole('button', { name: 'Konfirmasi Check-in' }).click()

  // The result closes itself after a moment, so everything on it is checked in
  // one assertion.
  await expect(page.getByRole('status').filter({ hasText: 'Checked In' })).toContainText(
    /Checked In[\s\S]*Sari Wulandari[\s\S]*Hadir: 1 \/ \d+/,
  )

  // Back on the list, the same ticket can no longer be checked in.
  await expect(row).toContainText('Sudah hadir')
  await expect(row.getByRole('button', { name: 'Check-in' })).toHaveCount(0)

  // And the participant's own ticket has turned into the checked-in screen.
  await page.goto(`/t/${token}`)
  await expect(page.getByRole('heading', { name: 'Checked In' })).toBeVisible()
})

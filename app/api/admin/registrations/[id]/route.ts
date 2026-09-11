import { z } from 'zod'

import { apiError } from '@/lib/api-response'
import { isAdmin } from '@/lib/auth'
import {
  adminCancelRegistration,
  adminManualCheckIn,
  adminRestoreRegistration,
  adminUndoCheckIn,
} from '@/lib/db/queries/registrations'
import { sheets } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

const actionBodySchema = z.object({
  action: z.enum(['manual_checkin', 'undo_checkin', 'cancel', 'restore']),
  staffLabel: z.string().max(80).optional(),
})

type RouteParams = {
  params: Promise<{
    id: string
  }>
}

/**
 * Handles administrative actions on a participant registration:
 * - manual_checkin: marks attended and adds audit trail with ADMIN staff label
 * - undo_checkin: resets check-in timestamp and staff label back to null
 * - cancel: marks cancelled and releases quota/phone slot
 * - restore: restores cancelled ticket back to confirmed if slot and phone are valid
 * (04-API-SPEC.md §8)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  if (!isAdmin(request)) {
    return apiError('UNAUTHORIZED', 'Kode admin tidak valid.', undefined, {
      'Cache-Control': 'no-store',
    })
  }

  const { id } = await params

  if (!id || typeof id !== 'string') {
    return apiError('VALIDATION_ERROR', 'ID pendaftaran tidak valid.')
  }

  const rawBody = await request.json().catch(() => null)
  const parsed = actionBodySchema.safeParse(rawBody)

  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Format aksi pendaftaran tidak valid.')
  }

  const { action, staffLabel } = parsed.data

  let result

  switch (action) {
    case 'manual_checkin':
      result = await adminManualCheckIn(id, staffLabel ? `ADMIN: ${staffLabel}` : 'ADMIN: Manual')
      if (result.status === 'ok' && sheets.isSheetsConfigured()) {
        const item = result.item
        await sheets.recordCheckInToSheet({
          ticketNumber: item.ticketNumber,
          fullName: item.fullName,
          checkedInAt: item.checkedInAt ? new Date(item.checkedInAt) : new Date(),
          checkedInBy: staffLabel ? `ADMIN: ${staffLabel}` : 'ADMIN: Manual',
          result: 'ok',
          mode: 'online',
        }).catch((err) => {
          console.warn('[Sheets Admin Check-in] Gagal mencatat check-in ke Sheets:', err)
        })
      }
      break
    case 'undo_checkin':
      result = await adminUndoCheckIn(id)
      break
    case 'cancel':
      result = await adminCancelRegistration(id)
      break
    case 'restore':
      result = await adminRestoreRegistration(id)
      break
  }

  if (result.status === 'not_found') {
    return apiError('NOT_FOUND', result.message)
  }

  if (result.status === 'already_checked_in') {
    return apiError('ALREADY_CHECKED_IN', result.message)
  }

  if (result.status === 'not_checked_in') {
    return apiError('VALIDATION_ERROR', result.message)
  }

  if (result.status === 'registration_cancelled') {
    return apiError('REGISTRATION_CANCELLED', result.message)
  }

  if (result.status === 'event_full') {
    return apiError('EVENT_FULL', result.message)
  }

  if (result.status === 'phone_already_registered') {
    return apiError('PHONE_ALREADY_REGISTERED', result.message)
  }

  return Response.json(
    { ok: true, item: result.item },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}

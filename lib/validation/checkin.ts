import { z } from 'zod'

// Disable JIT evaluation probing (`new Function("")`) to comply with strict CSP in production
z.config({ jitless: true })

// The scanner sends whatever the QR code carried, which is a full ticket URL.
// Manual search sends a bare token. extractToken sorts out which is which.
const scannedToken = z.string().trim().min(1).max(300)

export const previewRequestSchema = z.object({
  token: scannedToken,
})

export const checkInRequestSchema = z.object({
  token: scannedToken,
  staffLabel: z.string().trim().max(80).optional(),
  clientScannedAt: z.iso.datetime().optional(),
})

export const BATCH_MAX_ITEMS = 200

const staffLabel = z.string().trim().max(80)

export const batchCheckInRequestSchema = z.object({
  staffLabel: staffLabel.optional(),
  items: z
    .array(
      z.object({
        token: scannedToken,
        clientScannedAt: z.iso.datetime(),
        // An officer can rename their gate while offline. The label in force when
        // each scan was confirmed is the one that belongs in the audit log.
        staffLabel: staffLabel.optional(),
      }),
    )
    .min(1)
    .max(BATCH_MAX_ITEMS),
})

export type PreviewRequest = z.infer<typeof previewRequestSchema>
export type CheckInRequest = z.infer<typeof checkInRequestSchema>
export type BatchCheckInRequest = z.infer<typeof batchCheckInRequestSchema>

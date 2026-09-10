import { z } from 'zod'

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

export type PreviewRequest = z.infer<typeof previewRequestSchema>
export type CheckInRequest = z.infer<typeof checkInRequestSchema>

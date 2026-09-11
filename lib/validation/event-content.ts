import { z } from 'zod'

const text = z.string().trim().min(1)

export const eventDetailSchema = z.object({
  label: text,
  value: text,
})

export const rundownEntrySchema = z.object({
  time: text,
  activity: text,
})

export type EventDetail = z.infer<typeof eventDetailSchema>
export type RundownEntry = z.infer<typeof rundownEntrySchema>

// The committee fills these in by hand in Supabase, so a malformed entry is
// dropped instead of taking the invitation page down with it.
function parseList<T>(schema: z.ZodType<T>, raw: unknown): T[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw.flatMap((item) => {
    const result = schema.safeParse(item)

    return result.success ? [result.data] : []
  })
}

export function parseEventDetails(raw: unknown): EventDetail[] {
  return parseList(eventDetailSchema, raw)
}

export function parseRundown(raw: unknown): RundownEntry[] {
  return parseList(rundownEntrySchema, raw)
}

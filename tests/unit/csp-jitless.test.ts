import { describe, expect, it } from 'vitest'
import { core } from 'zod'

import {
  fullNameSchema,
  phoneSchema,
  registrationFormSchema,
} from '@/lib/validation/registration'

describe('CSP & JIT-less configuration', () => {
  it('enables jitless mode to comply with strict CSP environments without unsafe-eval', () => {
    // Under strict CSP, `new Function("")` triggers a securitypolicyviolation error.
    // Setting `jitless: true` short-circuits the `allowsEval` probe in Zod v4.
    expect(core.globalConfig.jitless).toBe(true)
  })

  it('does not invoke the Function constructor during schema evaluation', () => {
    const origFunction = globalThis.Function
    let probeAttempted = false

    // Intercept Function constructor
    // @ts-expect-error test interceptor
    globalThis.Function = function StubFunction(...args: unknown[]) {
      probeAttempted = true
      return new origFunction(...(args as [string]))
    }

    try {
      const result = registrationFormSchema.safeParse({
        fullName: 'Budi Santoso',
        phone: '08123456789',
        email: 'budi@example.com',
        notes: 'Test note',
        consent: true,
      })

      expect(result.success).toBe(true)
      expect(probeAttempted).toBe(false)
    } finally {
      globalThis.Function = origFunction
    }
  })

  it('correctly validates individual schemas under jitless mode', () => {
    expect(fullNameSchema.safeParse('Budi Santoso').success).toBe(true)
    expect(phoneSchema.safeParse('08123456789').success).toBe(true)
  })
})

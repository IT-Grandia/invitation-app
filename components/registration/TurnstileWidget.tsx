'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

interface TurnstileWidgetProps {
  siteKey?: string
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: (error?: string) => void
  className?: string
  resetTrigger?: number
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string
          callback?: (token: string) => void
          'error-callback'?: (errorCode?: string) => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'compact' | 'flexible'
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

export function TurnstileWidget({
  siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  onVerify,
  onExpire,
  onError,
  className,
  resetTrigger = 0,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  // In development without site key, use Cloudflare's always-passing test key
  const isDev = process.env.NODE_ENV !== 'production'
  const effectiveSiteKey = siteKey || (isDev ? '1x00000000000000000000AA' : undefined)

  useEffect(() => {
    // If no site key is configured (even in production), fail open gracefully per 06-SECURITY.md §A4
    if (!effectiveSiteKey) {
      onVerify('bypass-no-site-key')
      return
    }

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) {
        return
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: effectiveSiteKey,
          callback: (token: string) => {
            onVerify(token)
          },
          'expired-callback': () => {
            onExpire?.()
          },
          'error-callback': (errorCode?: string) => {
            onError?.(errorCode)
          },
          theme: 'light',
        })
        widgetIdRef.current = id
      } catch (err) {
        console.warn('Turnstile render error:', err)
      }
    }

    if (window.turnstile) {
      renderWidget()
    }
  }, [scriptLoaded, effectiveSiteKey, onVerify, onExpire, onError])

  // Reset widget when resetTrigger changes
  useEffect(() => {
    if (resetTrigger > 0 && widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current)
      } catch {
        // ignore reset error
      }
    }
  }, [resetTrigger])

  // Clean up widget on unmount
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore cleanup error
        }
        widgetIdRef.current = null
      }
    }
  }, [])

  if (!effectiveSiteKey) {
    return null
  }

  return (
    <div className={className ?? 'my-2 flex min-h-[65px] justify-center items-center'}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} />
    </div>
  )
}

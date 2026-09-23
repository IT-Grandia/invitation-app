import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { RegistrationForm } from '@/components/registration/RegistrationForm'
import { ScrollReveal } from '@/components/registration/ScrollReveal'
import { BrandHeader } from '@/components/ui/BrandHeader'
import { getPublishedEvent } from '@/lib/db/queries/event'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'RSVP • FA Live Padel Society',
  description: 'Please fill in the form to confirm your attendance and receive your QR Code.',
}

const backdropStripesStyle: React.CSSProperties = {
  backgroundColor: '#F5EFE1',
  backgroundImage: `repeating-linear-gradient(
    90deg,
    #F5EFE1 0px,
    #F5EFE1 var(--regist-stripe-w, 32px),
    #E8E3D1 var(--regist-stripe-w, 32px),
    #E8E3D1 calc(var(--regist-stripe-w, 32px) * 2)
  )`,
  backgroundPosition: 'center top',
}

export default async function RegistPage() {
  let contactWhatsapp: string | null = null

  try {
    const event = await getPublishedEvent()
    if (event) {
      contactWhatsapp = event.contactWhatsapp
    }
  } catch {
    // Graceful fallback to default values if database is unreachable
  }

  return (
    <>
      <style>{`
        .regist-backdrop {
          --regist-stripe-w: 28px;
        }
        @media (min-width: 640px) {
          .regist-backdrop {
            --regist-stripe-w: 32px;
          }
        }
      `}</style>
      <main
        className="regist-backdrop relative min-h-screen text-ink antialiased"
        style={backdropStripesStyle}
      >
        {/* Top Header: Clean BrandHeader matching QR ticket page style */}
        <header className="w-full border-b border-line bg-surface px-4 py-4 sm:py-5 flex items-center justify-center text-center">
          <div className="max-w-5xl mx-auto flex items-center justify-center">
            <BrandHeader hideBorder />
          </div>
        </header>

      {/* Main Content Area */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-6 sm:pt-8 md:pt-10 pb-16">
        {/* Back link with clean pill treatment for superior mobile tap target */}
        <ScrollReveal delay={50} direction="down">
          <div className="mb-6 sm:mb-8 flex justify-center md:justify-start">
            <Link
              href="/"
              className="inline-flex min-h-tap items-center gap-2 font-sans text-xs tracking-[0.14em] font-semibold text-primary hover:text-ink bg-surface border border-line px-4 py-2 rounded-full shadow-card transition-all active:scale-[0.98]"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>BACK TO HOME</span>
            </Link>
          </div>
        </ScrollReveal>

        {/* Layout: Centered & balanced on mobile, two-column grid on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10 md:gap-12 lg:gap-16 items-start">
          {/* Left Column: Exact Kindly RSVP lockup + Event Context */}
          <div className="md:col-span-5 flex flex-col items-center text-center md:items-start md:text-left">
            <ScrollReveal delay={100} direction="up">
              {/* Exact Kindly RSVP visual lockup from reference photo */}
              <div className="w-[210px] sm:w-[260px] md:w-[310px] mx-auto md:mx-0 mb-4 sm:mb-5">
                <Image
                  src="/kindly-rsvp.png"
                  alt="Kindly RSVP"
                  width={355}
                  height={308}
                  priority
                  className="w-full h-auto select-none pointer-events-none drop-shadow-sm"
                />
              </div>

              {/* Event Context & Presenter Branding */}
              <div className="space-y-1.5 mb-3 sm:mb-4">
                <p className="font-sans text-xs tracking-[0.2em] font-semibold text-ink-muted uppercase">
                  The Grandia Group presents
                </p>
                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl tracking-tight font-bold text-primary">
                  &ldquo;FA Live Padel Society&rdquo;
                </h1>
                <p className="font-sans text-xs sm:text-sm tracking-[0.08em] text-ink-muted font-medium">
                  Powered by BINUS SCHOOL Semarang × Immoderma Clinic
                </p>
              </div>

              {/* Subtle ornamental divider */}
              <div className="w-12 h-px bg-line mx-auto md:mx-0 my-3.5" />

              {/* Instructions text */}
              <p className="font-sans text-sm sm:text-base text-ink-muted leading-relaxed max-w-sm md:max-w-md mx-auto md:mx-0 text-pretty">
                Please fill in the form to confirm your attendance and receive your QR Code.
              </p>
            </ScrollReveal>
          </div>

          {/* Right Column: Refined RSVP Form Card */}
          <div className="md:col-span-7 w-full">
            <ScrollReveal delay={200} direction="up">
              <div className="relative overflow-hidden rounded-card border border-line bg-surface p-5 sm:p-7 md:p-8 shadow-card">
                {/* Clean focused form header */}
                <div className="text-center space-y-1 mb-5 sm:mb-6 pb-4 border-b border-line">
                  <span className="inline-block px-3 py-1 rounded-full bg-surface-2 border border-line font-sans text-[10px] sm:text-xs tracking-[0.18em] font-semibold text-primary uppercase">
                    REGISTRATION FORM
                  </span>
                  <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-primary pt-1">
                    Event Attendance RSVP
                  </h2>
                </div>

                {/* The Form */}
                <RegistrationForm contactWhatsapp={contactWhatsapp} />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Bottom Atmosphere Keepsake Card */}
      <section className="relative w-full border-t border-line bg-surface-2 py-14 sm:py-16 px-4 sm:px-6 md:px-8">
        <div className="max-w-xl mx-auto text-center">
          <ScrollReveal delay={100} direction="up">
            {/* Tilted Keepsake Card */}
            <div className="relative overflow-hidden rounded-card border border-line bg-surface p-6 sm:p-8 md:p-10 shadow-card -rotate-1 sm:-rotate-2 transition-transform duration-300 hover:rotate-0">
              {/* Corner Stamp Accent */}
              <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 border border-line-input rounded px-2 py-0.5 font-sans text-[10px] font-semibold tracking-[0.16em] text-ink-muted">
                26 SEP 2026
              </div>

              {/* Decorative Icon (Lucide/Heroicons SVG style) */}
              <div className="mb-2.5 flex justify-center text-primary">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 stroke-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>

              {/* Keepsake headline */}
              <h3 className="font-display text-2xl sm:text-3xl text-primary leading-tight mb-2.5 font-bold">
                We look forward to seeing you on the court!
              </h3>

              {/* Body Content */}
              <p className="font-sans text-xs sm:text-sm text-ink-muted max-w-md mx-auto leading-relaxed mb-5 sm:mb-6">
                Get ready for a day of friendly rallies, fun matches, and great company. Whether you&apos;re holding a padel racket for the first time or playing regularly, this gathering is all about celebrating the sport and community together.
              </p>

              {/* Highlights 3-column badge row */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3.5 border-t border-line text-xs font-sans text-ink">
                <div className="rounded-md bg-surface-2 border border-line p-2 sm:p-2.5 text-center">
                  <span className="block font-display text-xs sm:text-sm font-bold text-primary truncate">
                    Community Meet
                  </span>
                  <span className="block font-sans text-[10px] sm:text-xs text-ink-muted mt-0.5 truncate">
                    Club 79 × HIPMI
                  </span>
                </div>
                <div className="rounded-md bg-surface-2 border border-line p-2 sm:p-2.5 text-center">
                  <span className="block font-display text-xs sm:text-sm font-bold text-primary truncate">
                    Gear Provided
                  </span>
                  <span className="block font-sans text-[10px] sm:text-xs text-ink-muted mt-0.5 truncate">
                    Rackets &amp; Balls
                  </span>
                </div>
                <div className="rounded-md bg-surface-2 border border-line p-2 sm:p-2.5 text-center">
                  <span className="block font-display text-xs sm:text-sm font-bold text-primary truncate">
                    Padel Ground
                  </span>
                  <span className="block font-sans text-[10px] sm:text-xs text-ink-muted mt-0.5 truncate">
                    Semarang · 26 Sep
                  </span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Bottom Homepage Navigation */}
          <ScrollReveal delay={200} direction="up">
            <div className="mt-8 sm:mt-10">
              <Link
                href="/"
                className="inline-flex min-h-tap items-center gap-2 font-sans text-xs tracking-[0.14em] font-semibold text-primary hover:text-ink transition-colors active:scale-[0.98]"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>BACK TO HOME</span>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
    </>
  )
}

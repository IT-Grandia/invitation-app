import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { RegistrationForm } from '@/components/registration/RegistrationForm'
import { ScrollReveal } from '@/components/registration/ScrollReveal'
import { getPublishedEvent } from '@/lib/db/queries/event'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'RSVP • FA Live Padel Society',
  description: 'Konfirmasi kehadiran dan reservasi tiket resmi FA Live Padel Society 2026.',
}

function EmbossedEnvelopeFlap() {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 -bottom-9 sm:-bottom-12 z-20 w-[125px] sm:w-[155px] md:w-[170px] drop-shadow-[0_10px_20px_rgba(46,60,46,0.16)] pointer-events-none select-none">
      <svg
        viewBox="0 0 170 95"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="envelopeGrad" x1="85" y1="0" x2="85" y2="95" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FAF7F0" />
            <stop offset="0.6" stopColor="#F3EDE0" />
            <stop offset="1" stopColor="#E9E1D0" />
          </linearGradient>
        </defs>

        {/* Outer Flap with Scalloped Edge */}
        <path
          d="M 0 0 L 170 0 C 170 20, 160 38, 140 54 C 120 70, 100 85, 85 92 C 70 85, 50 70, 30 54 C 10 38, 0 20, 0 0 Z"
          fill="url(#envelopeGrad)"
          stroke="#DDD5C4"
          strokeWidth="1.2"
        />

        {/* Inner Embossed Border */}
        <path
          d="M 12 0 C 12 18, 22 34, 38 48 C 56 62, 74 76, 85 81 C 96 76, 114 62, 132 48 C 148 34, 158 18, 158 0"
          stroke="#C5BCA8"
          strokeWidth="1"
          strokeDasharray="3 2"
          fill="none"
          opacity="0.8"
        />

        {/* Filigree Ornament / Baroque Relief */}
        <g stroke="#B8AD98" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.85">
          {/* Left scroll */}
          <path d="M 52 32 C 60 26, 72 32, 75 42 C 77 48, 70 55, 62 50 C 58 47, 58 40, 64 36" />
          {/* Right scroll */}
          <path d="M 118 32 C 110 26, 98 32, 95 42 C 93 48, 100 55, 108 50 C 112 47, 112 40, 106 36" />
          {/* Central crest */}
          <path d="M 85 24 C 82 28, 80 34, 85 40 C 90 34, 88 28, 85 24 Z" fill="#D8CFBD" />
          <path d="M 85 40 L 85 64" strokeWidth="1.2" />
          <circle cx="85" cy="46" r="6" fill="#EDE6D6" stroke="#B8AD98" />
          <circle cx="85" cy="46" r="2.5" fill="#7F836A" />
          {/* Bottom flap flourish */}
          <path d="M 76 74 C 81 78, 89 78, 94 74" />
          <circle cx="85" cy="80" r="1.5" fill="#B8AD98" />
        </g>
      </svg>
    </div>
  )
}

export default async function DaftarPage() {
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
      {/* Editorial fonts: Calligraphic script (Alex Brush) + Serifs + Sans */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <main className="relative min-h-screen bg-[#F8F6EA] text-[#243024] antialiased selection:bg-[#4E644D]/20">
        {/* Top Header Banner: Deep forest green (secondary #4E644D) with cursive script watermark */}
        <header className="relative w-full h-24 sm:h-32 md:h-36 bg-[#4E644D] border-b border-[#3D523C] overflow-visible flex items-center justify-center">
          {/* Subtle horizontal borders */}
          <div className="absolute top-2 inset-x-0 h-px bg-[#A2B5A0]/20" />
          <div className="absolute bottom-2 inset-x-0 h-px bg-[#A2B5A0]/20" />

          {/* Watermark Calligraphy text inspired by reference template */}
          <div className="w-full px-6 flex items-center justify-between pointer-events-none select-none overflow-hidden opacity-35">
            <span className="font-['Alex_Brush',cursive] text-3xl sm:text-5xl md:text-6xl text-[#D8E6D5] tracking-wider whitespace-nowrap">
              FA Live Padel Society
            </span>
            <span className="hidden md:inline font-['Alex_Brush',cursive] text-4xl sm:text-6xl text-[#D8E6D5] tracking-wider whitespace-nowrap">
              The Grandia Group × BINUS
            </span>
          </div>

          {/* Overlapping Embossed Cream Envelope Flap */}
          <EmbossedEnvelopeFlap />
        </header>

        {/* Main Content Area */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-12 sm:pt-16 md:pt-20 pb-16">
          {/* Back link with clean pill treatment for superior mobile tap target */}
          <ScrollReveal delay={50} direction="down">
            <div className="mb-6 sm:mb-8 flex justify-center md:justify-start">
              <Link
                href="/"
                className="inline-flex items-center gap-2 font-['Cinzel',serif] text-[11px] sm:text-xs tracking-[0.2em] font-semibold text-[#4E644D] hover:text-[#243024] bg-[#F2EDE1]/80 hover:bg-[#EAE4D4] border border-[#DDD6C5] px-4 py-2 rounded-full shadow-xs transition-all active:scale-[0.98]"
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
                <span>KEMBALI KE BERANDA</span>
              </Link>
            </div>
          </ScrollReveal>

          {/* Layout: Centered & balanced on mobile, two-column grid on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10 md:gap-12 lg:gap-16 items-start">
            {/* Left Column: Exact Kindly RSVP lockup + Event Branding (Centered on mobile, left on desktop) */}
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

                {/* Event Society Branding Context */}
                <div className="space-y-1 mb-3 sm:mb-4">
                  <h1 className="font-['Cinzel',serif] text-sm sm:text-base tracking-[0.24em] font-bold text-[#4E644D]">
                    FA LIVE PADEL SOCIETY
                  </h1>
                  <p className="font-['Cinzel',serif] text-[10px] sm:text-[11px] tracking-[0.16em] text-[#7F836A] font-semibold">
                    POWERED BY THE GRANDIA GROUP × BINUS SCHOOL SEMARANG
                  </p>
                  <p className="font-['Cormorant_Garamond',serif] italic text-xs tracking-[0.22em] text-[#4E644D]/80 mt-0.5">
                    PLAY. CONNECT. BELONG.
                  </p>
                </div>

                {/* Subtle ornamental divider */}
                <div className="w-12 h-px bg-[#7F836A]/30 mx-auto md:mx-0 my-3" />

                {/* Invitation Subtitle */}
                <p className="font-['Cormorant_Garamond',serif] text-sm sm:text-base md:text-lg text-[#4E644D] leading-relaxed italic max-w-sm md:max-w-md mx-auto md:mx-0">
                  Silakan lakukan konfirmasi kehadiran Anda untuk acara FA Live Padel Society sebelum kuota pendaftaran terpenuhi.
                </p>

                {/* Reassurance text */}
                <p className="text-[11px] sm:text-xs font-['Cormorant_Garamond',serif] text-[#4E644D]/75 italic mt-2.5 max-w-sm md:max-w-md mx-auto md:mx-0">
                  E-ticket dengan kode QR unik akan diterbitkan secara instan setelah formulir reservasi tersimpan.
                </p>
              </ScrollReveal>
            </div>

            {/* Right Column: Refined RSVP Form Card */}
            <div className="md:col-span-7 w-full">
              <ScrollReveal delay={200} direction="up">
                <div className="relative overflow-hidden rounded-[16px] border border-[#E0DAC9] bg-[#FAF8F1] p-5 sm:p-7 md:p-8 shadow-[0_8px_32px_rgba(78,100,77,0.06)]">
                  {/* Clean focused form header without repeating society branding */}
                  <div className="text-center space-y-1 mb-5 sm:mb-6 pb-4 border-b border-[#E8E3D5]">
                    <span className="inline-block px-3 py-1 rounded-full bg-[#EAE4D4]/70 border border-[#DDD6C5] font-['Cinzel',serif] text-[9px] sm:text-[10px] tracking-[0.22em] font-semibold text-[#4E644D]">
                      FORMULIR RESERVASI
                    </span>
                    <h2 className="font-['Cormorant_Garamond',serif] text-base sm:text-lg font-semibold tracking-[0.06em] text-[#7F836A] italic pt-1">
                      Reservasi Tiket Peserta
                    </h2>
                  </div>

                  {/* The Form */}
                  <RegistrationForm contactWhatsapp={contactWhatsapp} />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>

        {/* Bottom Atmosphere Keepsake Card (Inspired by the open envelope & postcard collage from the reference photo) */}
        <section className="relative w-full border-t border-[#DED7C5] bg-[#EFECE1] py-14 sm:py-16 px-4 sm:px-6 md:px-8">
          <div className="max-w-xl mx-auto text-center">
            <ScrollReveal delay={100} direction="up">
              {/* Tilted Ivory Keepsake Card */}
              <div className="relative overflow-hidden rounded-[14px] border border-[#D5D0BF] bg-[#FAF8F2] p-6 sm:p-8 md:p-10 shadow-[0_12px_36px_rgba(46,60,46,0.1)] -rotate-1 sm:-rotate-2 transition-transform duration-300 hover:rotate-0">
                {/* Corner Stamp Accent */}
                <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 border border-[#4E644D]/40 rounded px-2 py-0.5 font-['Cinzel',serif] text-[9px] tracking-[0.18em] text-[#4E644D]">
                  EST. 2026
                </div>

                {/* Decorative Icon (Lucide/Heroicons SVG style - No emojis) */}
                <div className="mb-2.5 flex justify-center text-[#7F836A]">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 stroke-[#7F836A]"
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

                {/* Cursive Handwriting message (Preserved as instructed) */}
                <h3 className="font-['Alex_Brush',cursive] text-2xl sm:text-3xl md:text-4xl text-[#4E644D] leading-tight mb-2.5">
                  We look forward to seeing you on the court!
                </h3>

                {/* Body Content: Clean Lorem Ipsum as instructed */}
                <p className="font-['Cormorant_Garamond',serif] italic text-xs sm:text-sm text-[#4E644D]/85 max-w-md mx-auto leading-relaxed mb-5 sm:mb-6">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
                </p>

                {/* Highlights 3-column badge row: Compact 3-col grid on mobile to eliminate clumsy stacking */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3.5 border-t border-[#E8E3D5] text-xs font-['Plus_Jakarta_Sans',sans-serif] text-[#4E644D]">
                  <div className="rounded-[8px] bg-[#F2EDE1]/80 border border-[#E2DBCB] p-2 sm:p-2.5 text-center">
                    <span className="block font-['Cinzel',serif] text-[10px] sm:text-xs font-bold text-[#4E644D] tracking-wider truncate">
                      Lorem Ipsum
                    </span>
                    <span className="block font-['Cormorant_Garamond',serif] italic text-[9px] sm:text-[11px] text-[#243024]/70 mt-0.5 truncate">
                      Dolor sit amet
                    </span>
                  </div>
                  <div className="rounded-[8px] bg-[#F2EDE1]/80 border border-[#E2DBCB] p-2 sm:p-2.5 text-center">
                    <span className="block font-['Cinzel',serif] text-[10px] sm:text-xs font-bold text-[#4E644D] tracking-wider truncate">
                      Consectetur
                    </span>
                    <span className="block font-['Cormorant_Garamond',serif] italic text-[9px] sm:text-[11px] text-[#243024]/70 mt-0.5 truncate">
                      Adipiscing elit
                    </span>
                  </div>
                  <div className="rounded-[8px] bg-[#F2EDE1]/80 border border-[#E2DBCB] p-2 sm:p-2.5 text-center">
                    <span className="block font-['Cinzel',serif] text-[10px] sm:text-xs font-bold text-[#4E644D] tracking-wider truncate">
                      Incididunt
                    </span>
                    <span className="block font-['Cormorant_Garamond',serif] italic text-[9px] sm:text-[11px] text-[#243024]/70 mt-0.5 truncate">
                      Labore et dolore
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
                  className="inline-flex items-center gap-2 font-['Cinzel',serif] text-[11px] sm:text-xs tracking-[0.2em] font-semibold text-[#4E644D] hover:text-[#243024] transition-colors active:scale-[0.98]"
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
                  <span>KEMBALI KE HALAMAN UTAMA</span>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
    </>
  )
}

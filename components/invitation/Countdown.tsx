"use client";

import { useEffect, useState } from "react";

type CountdownProps = {
  /** When the event starts, ISO 8601 UTC. */
  targetIso: string;
  /**
   * The server's clock at render time. The first paint is computed from this on
   * both sides of hydration, so the markup matches exactly; only after mount
   * does the component switch to the browser clock and start ticking.
   */
  serverNowIso: string;
  /** Read out to screen readers in place of the digits, which change too often. */
  startsAtLabel: string;
};

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  finished: boolean;
};

function remainingUntil(targetMs: number, nowMs: number): Remaining {
  const diff = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(diff / 1000);

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    finished: diff === 0,
  };
}

export function Countdown({ targetIso, serverNowIso, startsAtLabel }: CountdownProps) {
  const targetMs = Date.parse(targetIso);
  const [remaining, setRemaining] = useState(() =>
    remainingUntil(targetMs, Date.parse(serverNowIso)),
  );

  useEffect(() => {
    function tick() {
      setRemaining(remainingUntil(targetMs, Date.now()));
    }

    tick();
    const timer = window.setInterval(tick, 1_000);

    return () => window.clearInterval(timer);
  }, [targetMs]);

  if (remaining.finished) {
    return <p className="text-lg font-semibold text-ink-muted">Acara sudah berlangsung.</p>;
  }

  const units = [
    { value: remaining.days, label: "Hari" },
    { value: remaining.hours, label: "Jam" },
    { value: remaining.minutes, label: "Menit" },
    { value: remaining.seconds, label: "Detik" },
  ];

  return (
    <div>
      <p className="sr-only">Acara dimulai {startsAtLabel}.</p>

      <div className="flex justify-center gap-2" aria-hidden="true">
        {units.map((unit) => (
          <div
            key={unit.label}
            className="min-w-16 rounded-card border border-line bg-surface px-3 py-2"
          >
            <div className="font-display text-countdown font-bold tabular-nums">
              {String(unit.value).padStart(2, "0")}
            </div>
            <div className="text-[0.65rem] tracking-widest text-ink-muted uppercase">
              {unit.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

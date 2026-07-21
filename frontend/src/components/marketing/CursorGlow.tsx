'use client';

import { useEffect, useRef } from 'react';

/**
 * Subtle custom cursor: a small ring that trails the real pointer. Pure CSS
 * transform updates driven by a mousemove listener + requestAnimationFrame
 * — no library, no layout-affecting DOM writes (only `transform`/`opacity`,
 * neither of which triggers reflow).
 *
 * Why this can't conflict with existing click handlers or accessibility:
 *   - `pointer-events-none` on the element itself — it is never a hit
 *     target, so no click/hover handler anywhere on the page can be
 *     intercepted by it.
 *   - Gated on `matchMedia('(pointer: fine)')` — touch devices (which have
 *     no persistent cursor to begin with) never mount the listener at all,
 *     so there's no dead floating circle on mobile/tablet.
 *   - Gated on `prefers-reduced-motion` — a user who has asked for less
 *     motion never gets an animated follower.
 *   - The real OS cursor is left completely alone (no `cursor: none`
 *     anywhere) — this is a decorative addition, not a replacement, so
 *     nothing about actual pointer behavior changes.
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersFinePointer || prefersReducedMotion) return;

    const el = ref.current;
    if (!el) return;

    let targetX = -100;
    let targetY = -100;
    let x = targetX;
    let y = targetY;
    let rafId: number;
    let started = false;

    function onMove(e: MouseEvent) {
      targetX = e.clientX;
      targetY = e.clientY;
      // Only fade the ring in once a real cursor position has arrived —
      // avoids a visible circle sitting at (0,0) before the first move.
      if (!started && el) {
        started = true;
        el.style.opacity = '1';
      }
    }

    function tick() {
      // Light easing rather than a 1:1 follow — reads as a deliberate
      // "glow trailing the cursor" effect rather than a duplicate pointer.
      x += (targetX - x) * 0.18;
      y += (targetY - y) * 0.18;
      if (el) el.style.transform = `translate3d(${x - 12}px, ${y - 12}px, 0)`;
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener('mousemove', onMove);
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[100] hidden h-6 w-6 rounded-full border border-marketing-accent/60 opacity-0 transition-opacity duration-300 sm:block"
      style={{ willChange: 'transform' }}
    />
  );
}

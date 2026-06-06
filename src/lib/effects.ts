// Tiny, asset-free sound + haptic feedback. The chime is synthesized with the
// Web Audio API (no audio files), so it ships nothing and works offline.

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = ctx ?? new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

/** A short, gentle three-note "ta-da" chime. */
export function playChime(): void {
  const ac = audioCtx();
  if (!ac) return;
  const schedule = () => {
    const now = ac.currentTime; // read AFTER the context is running
    const notes = [659.25, 783.99, 987.77]; // E5, G5, B5 — a soft major triad
    notes.forEach((freq, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ac.destination);
      const t = now + i * 0.1;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.13, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.start(t);
      o.stop(t + 0.34);
    });
  };
  // resume first (autoplay policy) so the very first chime isn't dropped
  if (ac.state === "suspended") ac.resume().then(schedule).catch(() => {});
  else schedule();
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

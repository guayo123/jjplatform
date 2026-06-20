/**
 * Tiny sound layer — plays an "oss" cue on key dojo moments (logging a training,
 * a belt/degree promotion). Gated by a user toggle (Ajustes → Sonidos) and
 * stored in localStorage. Drops the cue silently if audio can't play.
 *
 * The cue lives at /sounds/oss3.mp3 (bundled in public/sounds). If it's missing or
 * blocked, a short synthesized "thunk" plays as a fallback so there's still feedback.
 */
const KEY = 'jjp_sound';

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

let audio: HTMLAudioElement | null = null;

function synthThunk(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.24);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {
    /* ignore */
  }
}

/** Play the "oss" cue (or the synth fallback). Must run from a user gesture. */
export function playOss(): void {
  if (!isSoundEnabled()) return;
  try {
    if (!audio) {
      audio = new Audio('/sounds/oss3.mp3');
      audio.preload = 'auto';
    }
    audio.currentTime = 0;
    const p = audio.play();
    if (p && typeof p.then === 'function') p.catch(() => synthThunk());
  } catch {
    synthThunk();
  }
}

// --- Duel cue (separate file + its own on/off toggle) ---------------------------
const DUEL_KEY = 'jjp_sound_duel';

export function isDuelSoundEnabled(): boolean {
  try {
    return localStorage.getItem(DUEL_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setDuelSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(DUEL_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

let duelAudio: HTMLAudioElement | null = null;

/** Play the duel cue when a challenge is sent. Must run from a user gesture; own toggle. */
export function playDuelo(): void {
  if (!isDuelSoundEnabled()) return;
  try {
    if (!duelAudio) {
      duelAudio = new Audio('/sounds/duelo.mp3');
      duelAudio.preload = 'auto';
    }
    duelAudio.currentTime = 0;
    const p = duelAudio.play();
    if (p && typeof p.then === 'function') p.catch(() => {});
  } catch {
    /* ignore */
  }
}

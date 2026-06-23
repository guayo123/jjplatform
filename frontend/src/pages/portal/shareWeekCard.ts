import type { ConditioningFocus, LeaderboardEntry, TrainingSession, TrainingSummary } from '../../types';
import { getMusclesFromFocus, getMusclesFromNames, type MuscleRegion } from './exerciseCatalog';

/**
 * Shareable "my training week" card, drawn straight onto a canvas (no DOM capture
 * dependency). 1080×1350 — Instagram's 4:5 portrait, also fine for WhatsApp stories.
 */
export interface WeekCardData {
  studentName: string;
  academyName: string | null;
  /** e.g. "2 – 8 jun 2026" (Mon–Sun of the current week). */
  rangeLabel: string;
  weekSessions: number;
  weekHours: number;
  weekRounds: number;
  currentStreak: number;
  /** 1-based position in the academy leaderboard, when there is one. */
  rank: { position: number; total: number } | null;
}

/** Local YYYY-MM-DD, matching the backend's LocalDate session strings. */
const ymd = (d: Date) => d.toLocaleDateString('en-CA');

/** Monday of the week containing `now` (ISO weeks, like the backend). */
function mondayOf(now: Date): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function buildWeekCardData(
  studentName: string,
  academyName: string | null,
  sessions: TrainingSession[],
  summary: TrainingSummary | null,
  board: LeaderboardEntry[],
  meId: number,
): WeekCardData {
  const now = new Date();
  const monday = mondayOf(now);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fromKey = ymd(monday);
  const toKey = ymd(sunday);

  let weekSessions = 0;
  let weekMinutes = 0;
  let weekRounds = 0;
  for (const s of sessions) {
    if (s.date >= fromKey && s.date <= toKey) {
      weekSessions++;
      weekMinutes += s.durationMin ?? 0;
      weekRounds += s.roundsCount ?? 0;
    }
  }

  const myIndex = board.findIndex((e) => e.studentId === meId);
  const fmt = (d: Date) => d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

  return {
    studentName,
    academyName,
    rangeLabel: `${fmt(monday)} – ${fmt(sunday)} ${now.getFullYear()}`,
    weekSessions,
    weekHours: Math.round((weekMinutes / 60) * 10) / 10,
    weekRounds,
    currentStreak: summary?.currentStreak ?? 0,
    rank: myIndex >= 0 && board.length >= 2 ? { position: myIndex + 1, total: board.length } : null,
  };
}

const W = 1080;
const H = 1350;

function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'left',
): void {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
}

const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export function drawWeekCard(data: WeekCardData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Dark dojo gradient with a warm glow up top.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1f2937');
  bg.addColorStop(1, '#0b101b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 0, 80, W / 2, 0, 700);
  glow.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
  glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 700);

  // Header
  if (data.academyName) {
    text(ctx, data.academyName.toUpperCase(), W / 2, 150, `600 34px ${SANS}`, '#9ca3af', 'center');
  }
  text(ctx, 'MI SEMANA DE ENTRENO 🥋', W / 2, 235, `800 60px ${SANS}`, '#ffffff', 'center');
  text(ctx, data.studentName, W / 2, 320, `700 46px ${SANS}`, '#fbbf24', 'center');
  text(ctx, data.rangeLabel, W / 2, 378, `400 32px ${SANS}`, '#9ca3af', 'center');

  // 2×2 stat grid
  const stats: Array<{ value: string; label: string }> = [
    { value: String(data.weekSessions), label: data.weekSessions === 1 ? 'entreno' : 'entrenos' },
    { value: data.weekHours > 0 ? String(data.weekHours) : '—', label: 'horas' },
    { value: data.weekRounds > 0 ? String(data.weekRounds) : '—', label: 'rounds' },
    { value: data.currentStreak > 0 ? `${data.currentStreak}🔥` : '—', label: 'días de racha' },
  ];
  const cellW = 440;
  const cellH = 270;
  const gap = 40;
  const gridX = (W - cellW * 2 - gap) / 2;
  const gridY = 460;
  stats.forEach((s, i) => {
    const x = gridX + (i % 2) * (cellW + gap);
    const y = gridY + Math.floor(i / 2) * (cellH + gap);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.roundRect(x, y, cellW, cellH, 28);
    ctx.fill();
    text(ctx, s.value, x + cellW / 2, y + 150, `800 100px ${SANS}`, '#ffffff', 'center');
    text(ctx, s.label, x + cellW / 2, y + 215, `500 34px ${SANS}`, '#9ca3af', 'center');
  });

  // Ranking band
  if (data.rank) {
    text(
      ctx,
      `🏆 #${data.rank.position} de ${data.rank.total} en mi academia`,
      W / 2,
      1180,
      `700 44px ${SANS}`,
      '#fbbf24',
      'center',
    );
  }

  text(ctx, 'JJPlatform', W / 2, 1290, `600 30px ${SANS}`, '#6b7280', 'center');
  return canvas;
}

export interface SessionCardData {
  date: string;            // YYYY-MM-DD
  modality: string | null;
  disciplineName: string | null;
  durationMin: number | null;
  roundsCount: number | null;
  energy: number | null;
  performance: number | null;
  techniques: string[];
  submissionsWon: string[];
  submissionsLost: string[];
  partners: Array<{ name: string; belt: string | null }>;
  notes: string | null;
  studentName: string;
  academyName: string | null;
}

const MODALITY_ES: Record<string, string> = {
  GI: 'Gi', NO_GI: 'No-Gi', OPEN_MAT: 'Open Mat', COMPETITION: 'Competición',
};

function wrapText(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, maxW: number, lineH: number): number {
  const words = txt.split(' ');
  let line = '';
  let cy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = w;
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line) { ctx.fillText(line, x, cy); cy += lineH; }
  return cy;
}

export function drawSessionCard(d: SessionCardData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1f2937');
  bg.addColorStop(1, '#0b101b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 0, 80, W / 2, 0, 600);
  glow.addColorStop(0, 'rgba(99,102,241,0.22)');
  glow.addColorStop(1, 'rgba(99,102,241,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 600);

  // Header
  if (d.academyName) text(ctx, d.academyName.toUpperCase(), W / 2, 130, `600 30px ${SANS}`, '#9ca3af', 'center');
  text(ctx, '🥋 ENTRENO', W / 2, 210, `800 56px ${SANS}`, '#ffffff', 'center');
  text(ctx, d.studentName, W / 2, 285, `700 42px ${SANS}`, '#a78bfa', 'center');

  // Date + modality
  const dateLabel = new Date(`${d.date}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  text(ctx, dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1), W / 2, 345, `400 30px ${SANS}`, '#9ca3af', 'center');
  const modalityStr = [d.modality ? (MODALITY_ES[d.modality] ?? d.modality) : null, d.disciplineName].filter(Boolean).join(' · ');
  if (modalityStr) text(ctx, modalityStr, W / 2, 395, `600 28px ${SANS}`, '#c4b5fd', 'center');

  // Stats row
  const statsData: Array<{ v: string; l: string }> = [];
  if (d.durationMin) statsData.push({ v: `${d.durationMin}`, l: 'minutos' });
  if (d.roundsCount) statsData.push({ v: `${d.roundsCount}`, l: 'rounds' });
  if (d.energy) statsData.push({ v: `${d.energy}/5`, l: 'energía ⚡' });
  if (d.performance) statsData.push({ v: `${d.performance}/5`, l: 'desempeño ⭐' });

  if (statsData.length > 0) {
    const cellW = Math.floor((W - 80) / statsData.length);
    statsData.forEach((s, i) => {
      const cx = 40 + i * cellW + cellW / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.roundRect(40 + i * cellW, 440, cellW - 20, 190, 20);
      ctx.fill();
      text(ctx, s.v, cx, 555, `800 72px ${SANS}`, '#ffffff', 'center');
      text(ctx, s.l, cx, 610, `400 26px ${SANS}`, '#9ca3af', 'center');
    });
  }

  let y = 680;
  const COL = 60;
  const COLW = W - COL * 2;

  // Techniques
  if (d.techniques.length > 0) {
    text(ctx, 'TÉCNICAS', COL, y, `700 24px ${SANS}`, '#6b7280', 'left');
    y += 38;
    ctx.font = `500 30px ${SANS}`;
    ctx.fillStyle = '#e5e7eb';
    y = wrapText(ctx, d.techniques.join('  ·  '), COL, y, COLW, 42);
    y += 18;
  }

  // Submissions
  if (d.submissionsWon.length > 0 || d.submissionsLost.length > 0) {
    text(ctx, 'SUMISIONES', COL, y, `700 24px ${SANS}`, '#6b7280', 'left');
    y += 38;
    if (d.submissionsWon.length > 0) {
      ctx.font = `500 30px ${SANS}`;
      ctx.fillStyle = '#4ade80';
      y = wrapText(ctx, `✓ ${d.submissionsWon.join(', ')}`, COL, y, COLW, 42);
    }
    if (d.submissionsLost.length > 0) {
      ctx.font = `500 30px ${SANS}`;
      ctx.fillStyle = '#f87171';
      y = wrapText(ctx, `✕ ${d.submissionsLost.join(', ')}`, COL, y, COLW, 42);
    }
    y += 18;
  }

  // Partners
  if (d.partners.length > 0) {
    text(ctx, 'COMPAÑEROS', COL, y, `700 24px ${SANS}`, '#6b7280', 'left');
    y += 38;
    const partnerStr = d.partners.map((p) => p.belt ? `${p.name} (${p.belt})` : p.name).join('  ·  ');
    ctx.font = `500 30px ${SANS}`;
    ctx.fillStyle = '#e5e7eb';
    y = wrapText(ctx, partnerStr, COL, y, COLW, 42);
    y += 18;
  }

  // Notes
  if (d.notes) {
    text(ctx, 'NOTAS', COL, y, `700 24px ${SANS}`, '#6b7280', 'left');
    y += 38;
    ctx.font = `italic 400 28px ${SANS}`;
    ctx.fillStyle = '#9ca3af';
    y = wrapText(ctx, `"${d.notes}"`, COL, y, COLW, 40);
  }

  text(ctx, 'JJPlatform', W / 2, H - 60, `600 28px ${SANS}`, '#4b5563', 'center');
  return canvas;
}

const ON   = '#f97316';
const OFF  = '#cbd5e1';
const BODY = '#e2e8f0';
const EDGE = '#94a3b8';

function silhouette(): string {
  return `<g fill="${BODY}" stroke="${EDGE}" stroke-width="1.4" stroke-linejoin="round">
    <circle cx="45" cy="17" r="11"/>
    <rect x="40" y="26" width="10" height="7" rx="2"/>
    <path d="M26 36 Q45 31 64 36 L61 96 Q45 101 29 96 Z"/>
    <path d="M26 37 Q19 40 18 60 L16 100 Q20 102 23 100 L26 62 Z"/>
    <path d="M64 37 Q71 40 72 60 L74 100 Q70 102 67 100 L64 62 Z"/>
    <path d="M30 95 L28 150 L31 196 Q35 198 38 196 L43 100 Z"/>
    <path d="M60 95 L62 150 L59 196 Q55 198 52 196 L47 100 Z"/>
  </g>`;
}

function bodyDiagramSVGs(muscles: MuscleRegion[]): [string, string] {
  const active = new Set(muscles);
  const f = (r: MuscleRegion) => active.has(r) ? ON : OFF;
  const front = `<svg viewBox="0 0 90 210" width="160" height="373" xmlns="http://www.w3.org/2000/svg">
    ${silhouette()}
    <ellipse cx="28" cy="40" rx="6" ry="5" fill="${f('shoulders')}"/>
    <ellipse cx="62" cy="40" rx="6" ry="5" fill="${f('shoulders')}"/>
    <path d="M33 44 Q45 41 45 41 L45 56 Q39 59 33 56 Z" fill="${f('chest')}"/>
    <path d="M57 44 Q45 41 45 41 L45 56 Q51 59 57 56 Z" fill="${f('chest')}"/>
    <rect x="38" y="60" width="14" height="28" rx="4" fill="${f('abs')}"/>
    <ellipse cx="21" cy="62" rx="3.6" ry="11" fill="${f('arms')}"/>
    <ellipse cx="69" cy="62" rx="3.6" ry="11" fill="${f('arms')}"/>
    <ellipse cx="35" cy="125" rx="6.5" ry="22" fill="${f('legs')}"/>
    <ellipse cx="55" cy="125" rx="6.5" ry="22" fill="${f('legs')}"/>
  </svg>`;
  const back = `<svg viewBox="0 0 90 210" width="160" height="373" xmlns="http://www.w3.org/2000/svg">
    ${silhouette()}
    <ellipse cx="28" cy="40" rx="6" ry="5" fill="${f('shoulders')}"/>
    <ellipse cx="62" cy="40" rx="6" ry="5" fill="${f('shoulders')}"/>
    <path d="M33 45 L45 43 L45 78 Q39 80 34 74 Z" fill="${f('back')}"/>
    <path d="M57 45 L45 43 L45 78 Q51 80 56 74 Z" fill="${f('back')}"/>
    <ellipse cx="21" cy="62" rx="3.6" ry="11" fill="${f('arms')}"/>
    <ellipse cx="69" cy="62" rx="3.6" ry="11" fill="${f('arms')}"/>
    <ellipse cx="37" cy="100" rx="6" ry="7" fill="${f('legs')}"/>
    <ellipse cx="53" cy="100" rx="6" ry="7" fill="${f('legs')}"/>
    <ellipse cx="35" cy="135" rx="6.5" ry="20" fill="${f('legs')}"/>
    <ellipse cx="55" cy="135" rx="6.5" ry="20" fill="${f('legs')}"/>
  </svg>`;
  return [front, back] as [string, string];
}

function svgToImage(svgStr: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

export interface ConditioningCardData {
  date: string;
  focus: string | null;
  durationMin: number | null;
  exercises: Array<{ name: string; sets: Array<{ reps: number | null; weightKg: number | null }> }>;
  notes: string | null;
  studentName: string;
  academyName: string | null;
}

const FOCUS_ES: Record<string, string> = {
  PIERNA: '🦵 Pierna', ESPALDA: '🔙 Espalda', PECHO: '🎯 Pecho', HOMBRO: '🤲 Hombro',
  BRAZO: '💪 Brazo', CORE: '🧱 Core', CARDIO: '🏃 Cardio', FULL_BODY: '🔥 Full Body',
};

export async function drawConditioningCard(d: ConditioningCardData): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1f2937');
  bg.addColorStop(1, '#0b101b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 0, 80, W / 2, 0, 600);
  glow.addColorStop(0, 'rgba(249,115,22,0.22)');
  glow.addColorStop(1, 'rgba(249,115,22,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 600);

  // Header
  if (d.academyName) text(ctx, d.academyName.toUpperCase(), W / 2, 110, `600 30px ${SANS}`, '#9ca3af', 'center');
  text(ctx, '🏋️ GYM', W / 2, 185, `800 56px ${SANS}`, '#ffffff', 'center');
  text(ctx, d.studentName, W / 2, 255, `700 42px ${SANS}`, '#fb923c', 'center');

  const dateLabel = new Date(`${d.date}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  text(ctx, dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1), W / 2, 310, `400 30px ${SANS}`, '#9ca3af', 'center');
  const sub = [d.focus ? (FOCUS_ES[d.focus] ?? d.focus) : null, d.durationMin ? `${d.durationMin} min` : null].filter(Boolean).join('  ·  ');
  if (sub) text(ctx, sub, W / 2, 358, `600 28px ${SANS}`, '#fdba74', 'center');

  // Body diagram SVG
  const exNames = d.exercises.map((e) => e.name).filter(Boolean);
  const muscles = exNames.length > 0
    ? getMusclesFromNames(exNames)
    : getMusclesFromFocus(d.focus as ConditioningFocus | null);
  if (muscles.length > 0) {
    const [frontSvg, backSvg] = bodyDiagramSVGs(muscles);
    const [frontImg, backImg] = await Promise.all([svgToImage(frontSvg), svgToImage(backSvg)]);
    const svgW = 160, svgH = 373;
    const totalW = svgW * 2 + 60;
    const startX = (W - totalW) / 2;
    ctx.drawImage(frontImg, startX, 385, svgW, svgH);
    ctx.drawImage(backImg, startX + svgW + 60, 385, svgW, svgH);
    // Legend
    const legY = 385 + svgH + 24;
    const dotR = 14;
    const legX = W / 2 - 180;
    ctx.beginPath(); ctx.arc(legX, legY, dotR, 0, Math.PI * 2); ctx.fillStyle = ON; ctx.fill();
    text(ctx, 'Trabajado', legX + 24, legY + 9, `400 26px ${SANS}`, '#9ca3af', 'left');
    ctx.beginPath(); ctx.arc(legX + 240, legY, dotR, 0, Math.PI * 2); ctx.fillStyle = OFF; ctx.fill();
    text(ctx, 'No objetivo', legX + 264, legY + 9, `400 26px ${SANS}`, '#9ca3af', 'left');
  }

  // Exercises
  const COL = 60;
  const COLW = W - COL * 2;
  let y = muscles.length > 0 ? 385 + 373 + 24 + 50 : 420;

  if (d.exercises.length > 0) {
    text(ctx, 'EJERCICIOS', COL, y, `700 24px ${SANS}`, '#6b7280', 'left');
    y += 44;

    for (const ex of d.exercises) {
      if (y > H - 150) break;
      ctx.font = `700 32px ${SANS}`;
      ctx.fillStyle = '#fb923c';
      y = wrapText(ctx, ex.name, COL, y, COLW, 44);

      if (ex.sets.length > 0) {
        const setsStr = ex.sets
          .map((s) => [s.reps != null ? `${s.reps}` : null, s.weightKg != null ? `${s.weightKg}kg` : null].filter(Boolean).join(' × '))
          .filter(Boolean)
          .join('  ·  ');
        if (setsStr) {
          ctx.font = `400 26px ${SANS}`;
          ctx.fillStyle = '#9ca3af';
          y = wrapText(ctx, setsStr, COL, y, COLW, 38);
        }
      }
      y += 16;
    }
  }

  // Notes
  if (d.notes && y < H - 120) {
    text(ctx, 'NOTAS', COL, y, `700 24px ${SANS}`, '#6b7280', 'left');
    y += 38;
    ctx.font = `italic 400 28px ${SANS}`;
    ctx.fillStyle = '#9ca3af';
    wrapText(ctx, `"${d.notes}"`, COL, y, COLW, 40);
  }

  text(ctx, 'JJPlatform', W / 2, H - 60, `600 28px ${SANS}`, '#4b5563', 'center');
  return canvas;
}

/**
 * Share the card via the Web Share API when the platform supports sharing files
 * (mobile browsers / WebViews); otherwise download it as a PNG. Returns what happened
 * so the UI can word its feedback. 'aborted' = the user closed the share sheet.
 */
export async function shareCard(canvas: HTMLCanvasElement, filename = 'mi-semana-entreno.png'): Promise<'shared' | 'downloaded' | 'aborted'> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('No se pudo generar la imagen.');
  const file = new File([blob], filename, { type: 'image/png' });

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Mi semana de entreno' });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'aborted';
      // Sharing failed for real — fall through to the download path.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}

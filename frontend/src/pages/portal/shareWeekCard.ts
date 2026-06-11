import type { LeaderboardEntry, TrainingSession, TrainingSummary } from '../../types';

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

/**
 * Share the card via the Web Share API when the platform supports sharing files
 * (mobile browsers / WebViews); otherwise download it as a PNG. Returns what happened
 * so the UI can word its feedback. 'aborted' = the user closed the share sheet.
 */
export async function shareCard(canvas: HTMLCanvasElement): Promise<'shared' | 'downloaded' | 'aborted'> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('No se pudo generar la imagen.');
  const file = new File([blob], 'mi-semana-entreno.png', { type: 'image/png' });

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
  a.download = 'mi-semana-entreno.png';
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}

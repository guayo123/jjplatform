import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import type { Schedule, AcademySettings } from '../../types';

// ─── Constants ───────────────────────────────────────────────────────────────
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAY_LABELS: Record<string, string> = {
  Lunes: 'LUN', Martes: 'MAR', 'Miércoles': 'MIÉ', Jueves: 'JUE', Viernes: 'VIE', Sábado: 'SÁB', Domingo: 'DOM',
};
const CLASS_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
const MONTHS_ES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
const MONTHS_LC = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// ─── Theme system ────────────────────────────────────────────────────────────
type Theme  = 'dark' | 'light' | 'brand';
type Format = 'poster' | 'story';

interface TC {
  bg: string; text: string; sub: string;
  accent: string; accentEnd: string; sep: string;
  dayBg: string; dayText: string; dayActiveBg: string; dayActiveText: string;
  cardText: string; dot: string; cardAlpha: number;
}

const THEMES: Record<Theme, TC> = {
  dark:  { bg:'#0D0D14', text:'#FFFFFF', sub:'#6B7280',                accent:'#DC2626', accentEnd:'#7F1D1D', sep:'rgba(255,255,255,0.07)', dayBg:'rgba(255,255,255,0.03)', dayText:'#374151',               dayActiveBg:'#1A1A2E',           dayActiveText:'#F3F4F6', cardText:'#F9FAFB', dot:'rgba(255,255,255,0.025)', cardAlpha:0.14 },
  light: { bg:'#FFFFFF',  text:'#111827', sub:'#6B7280',                accent:'#DC2626', accentEnd:'#991B1B', sep:'rgba(0,0,0,0.10)',        dayBg:'#F9FAFB',               dayText:'#9CA3AF',               dayActiveBg:'#FEF2F2',           dayActiveText:'#111827',  cardText:'#111827',  dot:'rgba(0,0,0,0.03)',           cardAlpha:0.10 },
  brand: { bg:'#7F1D1D',  text:'#FFFFFF', sub:'rgba(255,255,255,0.65)', accent:'#FCA5A5', accentEnd:'#450A0A', sep:'rgba(255,255,255,0.12)', dayBg:'rgba(0,0,0,0.15)',       dayText:'rgba(255,255,255,0.3)', dayActiveBg:'rgba(0,0,0,0.22)', dayActiveText:'#FFFFFF',  cardText:'#FFFFFF',  dot:'rgba(255,255,255,0.04)',     cardAlpha:0.25 },
};

// ─── Canvas helpers ──────────────────────────────────────────────────────────
function classColor(n: string): string {
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  return CLASS_COLORS[h % CLASS_COLORS.length];
}
function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function trunc(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function logoPlaceholder(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, size: number, tc: TC) {
  ctx.fillStyle = tc.dayActiveBg;
  ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = tc.sub;
  ctx.font = `bold ${Math.round(size * 0.42)}px Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name.charAt(0).toUpperCase(), x + size / 2, y + size / 2);
}

function drawIgIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const g = ctx.createLinearGradient(x, y + s, x + s, y);
  g.addColorStop(0, '#FCAF45'); g.addColorStop(0.4, '#FD1D1D'); g.addColorStop(1, '#833AB4');
  ctx.fillStyle = g; rr(ctx, x, y, s, s, s * 0.24); ctx.fill();
  const p = s * 0.17; const iS = s - p * 2;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.09; ctx.lineJoin = 'round';
  rr(ctx, x + p, y + p, iS, iS, s * 0.13); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + s / 2, y + s * 0.53, s * 0.15, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + s * 0.72, y + s * 0.28, s * 0.08, 0, Math.PI * 2); ctx.fill();
}

function drawWaIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = '#25D366'; rr(ctx, x, y, s, s, s * 0.24); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round';
  const cx = x + s / 2, cy = y + s / 2, r = s * 0.25;
  ctx.beginPath(); ctx.arc(cx - r * 0.4, cy - r * 0.8, r * 0.38, Math.PI * 0.7, Math.PI * 1.7); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + r * 0.4, cy + r * 0.8, r * 0.38, Math.PI * 1.7, Math.PI * 2.7); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, Math.PI * 0.52, Math.PI * 1.48); ctx.stroke();
  ctx.lineCap = 'butt';
}

function drawContactRow(
  ctx: CanvasRenderingContext2D, tc: TC,
  cx: number, cy: number,
  ig: string, wa: string, fontSize: number
) {
  if (!ig && !wa) return;
  const iconS = Math.round(fontSize * 1.5);
  const gap = Math.round(fontSize * 0.45);
  const sep = '   ·   ';
  const font = `${fontSize}px Arial, sans-serif`;
  ctx.font = font;
  const igTextW = ig ? ctx.measureText(ig).width : 0;
  const waTextW = wa ? ctx.measureText(wa).width : 0;
  const sepW = ig && wa ? ctx.measureText(sep).width : 0;
  const igBlock = ig ? iconS + gap + igTextW : 0;
  const waBlock = wa ? iconS + gap + waTextW : 0;
  const totalW = igBlock + sepW + waBlock;
  let cur = cx - totalW / 2;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  if (ig) {
    drawIgIcon(ctx, cur, cy - iconS / 2, iconS); cur += iconS + gap;
    ctx.fillStyle = tc.sub; ctx.font = font; ctx.fillText(ig, cur, cy); cur += igTextW;
  }
  if (ig && wa) { ctx.fillStyle = tc.sub; ctx.font = font; ctx.fillText(sep, cur, cy); cur += sepW; }
  if (wa) {
    drawWaIcon(ctx, cur, cy - iconS / 2, iconS); cur += iconS + gap;
    ctx.fillStyle = tc.sub; ctx.font = font; ctx.fillText(wa, cur, cy);
  }
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
}

// ─── Layout constants ────────────────────────────────────────────────────────
const W = 1080; const PAD = 48;
const HEADER_H = 120; const DAY_ROW_H = 44; const CARD_H = 66; const CARD_GAP = 5;
const STORY_H = 1920; const STORY_PAD = 54;
const STORY_HEADER_H = 200; const STORY_COL_GAP = 20;
const STORY_DAY_H = 46; const STORY_CARD_H = 72; const STORY_CARD_GAP = 6;

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  schedules: Schedule[];
  academy: Pick<AcademySettings, 'name' | 'logoUrl' | 'instagram' | 'whatsapp'>;
  onClose: () => void;
}
type FontChoice = 'default' | 'bangers' | 'pressstart' | 'russo' | 'marker';

const FONT_OPTIONS: { id: FontChoice; label: string; family: string; google: string | null }[] = [
  { id: 'default',    label: 'Clásica',    family: 'Arial, sans-serif',      google: null },
  { id: 'bangers',    label: '💥 Acción',  family: 'Bangers',                google: 'Bangers' },
  { id: 'russo',      label: '🥋 Combate', family: 'Russo One',              google: 'Russo+One' },
  { id: 'pressstart', label: '👾 Arcade',  family: "'Press Start 2P'",       google: 'Press+Start+2P' },
  { id: 'marker',     label: '✍️ Marcador',family: "'Permanent Marker'",      google: 'Permanent+Marker' },
];

async function loadGoogleFont(googleName: string) {
  const linkId = `gf-${googleName}`;
  if (!document.getElementById(linkId)) {
    const link = document.createElement('link');
    link.id = linkId; link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${googleName}&display=swap`;
    document.head.appendChild(link);
  }
  const family = googleName.replace(/\+/g, ' ');
  try { await document.fonts.load(`bold 16px '${family}'`); } catch { /* ignore */ }
}

interface RO { theme: Theme; format: Format; onlyActiveDays: boolean; tagline: string; showQr: boolean; fontFamily: string; }

// ─── Small UI helper ─────────────────────────────────────────────────────────
function ToggleBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${active ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
    >{label}</button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SchedulePosterModal({ schedules, academy, onClose }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const previewRef  = useRef<HTMLImageElement>(null);

  const [theme,          setTheme]          = useState<Theme>('dark');
  const [format,         setFormat]         = useState<Format>('poster');
  const [onlyActiveDays, setOnlyActiveDays] = useState(false);
  const [tagline,        setTagline]        = useState('');
  const [showQr,         setShowQr]         = useState(true);
  const [fontChoice,     setFontChoice]     = useState<FontChoice>('default');
  const [rendering,      setRendering]      = useState(false);
  const [downloading,    setDownloading]    = useState(false);

  const currentFont = FONT_OPTIONS.find((f) => f.id === fontChoice)!;

  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(window.devicePixelRatio ?? 1, 2);
    const opts: RO = { theme, format, onlyActiveDays, tagline, showQr, fontFamily: currentFont.family };
    const googleName = currentFont.google;
    const run = async () => {
      if (googleName) await loadGoogleFont(googleName);
      await render(canvas, dpr, opts);
      if (cancelled) return;
      if (previewRef.current) previewRef.current.src = canvas.toDataURL('image/png');
      setRendering(false);
    };
    run();
    return () => { cancelled = true; };
  }, [theme, format, onlyActiveDays, tagline, showQr, fontChoice]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers (closures over schedules + academy) ──────────────────────────────

  async function loadLogo(ctx: CanvasRenderingContext2D, tc: TC, x: number, y: number, size: number) {
    if (academy.logoUrl) {
      await new Promise<void>((res) => {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.src = academy.logoUrl!.startsWith('/') ? `http://localhost:8081${academy.logoUrl}` : academy.logoUrl!;
        img.onload = () => {
          ctx.save();
          ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(img, x, y, size, size);
          ctx.restore(); res();
        };
        img.onerror = () => { logoPlaceholder(ctx, academy.name, x, y, size, tc); res(); };
      });
    } else {
      logoPlaceholder(ctx, academy.name, x, y, size, tc);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  }

  function drawCard(ctx: CanvasRenderingContext2D, tc: TC, x: number, y: number, w: number, h: number, s: Schedule, fontFamily: string) {
    const color = classColor(s.className);
    ctx.fillStyle = hexAlpha(color, tc.cardAlpha); rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = color; rr(ctx, x, y, 4, h, 3); ctx.fill();
    ctx.fillStyle = tc.cardText; ctx.font = `bold 11px ${fontFamily}`; ctx.textBaseline = 'top';
    ctx.fillText(trunc(ctx, s.className, w - 17), x + 12, y + 11);
    ctx.fillStyle = color; ctx.font = `10px ${fontFamily}`;
    ctx.fillText(`${s.startTime.slice(0, 5)} – ${s.endTime.slice(0, 5)}`, x + 12, y + 30);
  }

  async function drawQrBlock(ctx: CanvasRenderingContext2D, tc: TC, x: number, y: number, size: number) {
    const wa = academy.whatsapp?.replace(/\D/g, '') ?? '';
    if (!wa) return;
    const msg = encodeURIComponent(`Hola, vi tu horario de clases y me gustaría obtener más información sobre ${academy.name} 🥋`);
    const dataUrl = await QRCode.toDataURL(`https://wa.me/${wa}?text=${msg}`, {
      width: size * 4, margin: 1,
      color: { dark: tc.text, light: tc.bg },
    });
    await new Promise<void>((res) => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, x, y, size, size); res(); };
      img.src = dataUrl;
    });
  }

  function igText() { return academy.instagram ? `@${academy.instagram.replace(/^@+/, '')}` : ''; }
  function waText() { return academy.whatsapp || ''; }

  function sortedCards(day: string): Schedule[] {
    return schedules.filter((s) => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // ── Main dispatcher ──────────────────────────────────────────────────────────
  async function render(canvas: HTMLCanvasElement, scale: number, opts: RO) {
    const tc = THEMES[opts.theme];
    const filtered = opts.onlyActiveDays ? DAYS.filter((d) => schedules.some((s) => s.dayOfWeek === d)) : DAYS;
    const activeDays = filtered.length > 0 ? filtered : DAYS;
    if (opts.format === 'story') {
      await renderStory(canvas, scale, tc, activeDays, opts);
    } else {
      await renderPoster(canvas, scale, tc, activeDays, opts);
    }
  }

  // ── Poster ──────────────────────────────────────────────────────────────────
  async function renderPoster(canvas: HTMLCanvasElement, scale: number, tc: TC, activeDays: string[], opts: RO) {
    const numCols = activeDays.length;
    const colW = (W - PAD * 2) / numCols;
    const maxCards = Math.max(...activeDays.map((d) => schedules.filter((s) => s.dayOfWeek === d).length), 1);
    const footerH = opts.showQr && academy.whatsapp ? 100 : 46;
    const taglineH = opts.tagline ? 52 : 0;
    const H = HEADER_H + 16 + DAY_ROW_H + 8 + maxCards * (CARD_H + CARD_GAP) + taglineH + footerH;

    canvas.width = W * scale; canvas.height = H * scale;
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d')!; ctx.scale(scale, scale);

    ctx.fillStyle = tc.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = tc.dot;
    for (let x = PAD; x < W - PAD; x += 44)
      for (let y = 20; y < H - 20; y += 44)
        { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill(); }

    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, tc.accent); g.addColorStop(1, tc.accentEnd);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 6);

    await loadLogo(ctx, tc, PAD, 22, 82);
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillStyle = tc.text; ctx.font = `bold 30px ${opts.fontFamily}`;
    ctx.fillText(trunc(ctx, academy.name.toUpperCase(), W - (PAD + 82 + 20) - PAD - 200), PAD + 82 + 20, 30);
    ctx.fillStyle = tc.sub; ctx.font = `14px ${opts.fontFamily}`;
    ctx.fillText('HORARIO DE CLASES', PAD + 82 + 20, 72);
    // Month/year pill
    const dateLabel = `${MONTHS_ES[new Date().getMonth()]} ${new Date().getFullYear()}`;
    ctx.font = `600 13px ${opts.fontFamily}`;
    const plW = ctx.measureText(dateLabel).width + 26; const plH = 26;
    const plX = W - PAD - plW;
    ctx.fillStyle = hexAlpha(tc.accent, 0.15); rr(ctx, plX, 26, plW, plH, plH / 2); ctx.fill();
    ctx.strokeStyle = hexAlpha(tc.accent, 0.4); ctx.lineWidth = 1; rr(ctx, plX, 26, plW, plH, plH / 2); ctx.stroke();
    ctx.fillStyle = tc.accent;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(dateLabel, plX + plW / 2, 26 + plH / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';

    ctx.strokeStyle = tc.sep; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, HEADER_H + 4); ctx.lineTo(W - PAD, HEADER_H + 4); ctx.stroke();

    const dayY = HEADER_H + 14;
    for (const [i, day] of activeDays.entries()) {
      const x = PAD + i * colW;
      const has = schedules.some((s) => s.dayOfWeek === day);
      ctx.fillStyle = has ? tc.dayActiveBg : tc.dayBg; rr(ctx, x + 2, dayY, colW - 4, DAY_ROW_H, 7); ctx.fill();
      ctx.fillStyle = has ? tc.dayActiveText : tc.dayText;
      ctx.font = `bold 12px ${opts.fontFamily}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(DAY_LABELS[day], x + colW / 2, dayY + DAY_ROW_H / 2);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';

    const cardY = dayY + DAY_ROW_H + 8;
    for (const [i, day] of activeDays.entries()) {
      const x = PAD + i * colW;
      sortedCards(day).forEach((s, j) => drawCard(ctx, tc, x + 3, cardY + j * (CARD_H + CARD_GAP), colW - 6, CARD_H, s, opts.fontFamily));
    }

    if (opts.tagline) {
      const pillFont = `italic 17px ${opts.fontFamily}`;
      ctx.font = pillFont;
      const pillTW = ctx.measureText(opts.tagline).width;
      const pillW = pillTW + 48; const pillH = 34;
      const pillX = (W - pillW) / 2;
      const pillY = cardY + maxCards * (CARD_H + CARD_GAP) + 14;
      ctx.fillStyle = hexAlpha(tc.accent, 0.18); rr(ctx, pillX, pillY, pillW, pillH, pillH / 2); ctx.fill();
      ctx.strokeStyle = hexAlpha(tc.accent, 0.45); ctx.lineWidth = 1; rr(ctx, pillX, pillY, pillW, pillH, pillH / 2); ctx.stroke();
      ctx.fillStyle = tc.text; ctx.font = pillFont;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(opts.tagline, W / 2, pillY + pillH / 2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    }

    const fy = H - footerH + 8;
    ctx.strokeStyle = tc.sep; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, fy - 4); ctx.lineTo(W - PAD, fy - 4); ctx.stroke();

    if (opts.showQr && academy.whatsapp) {
      const qrSize = 72;
      await drawQrBlock(ctx, tc, W - PAD - qrSize, fy, qrSize);
      const availCX = PAD + (W - 2 * PAD - qrSize - 20) / 2;
      drawContactRow(ctx, tc, availCX, fy + qrSize / 2, igText(), waText(), 13);
    } else {
      drawContactRow(ctx, tc, W / 2, fy + 22, igText(), waText(), 13);
    }
  }

  // ── Story ────────────────────────────────────────────────────────────────────
  async function renderStory(canvas: HTMLCanvasElement, scale: number, tc: TC, activeDays: string[], opts: RO) {
    canvas.width = W * scale; canvas.height = STORY_H * scale;
    canvas.style.width = `${W}px`; canvas.style.height = `${STORY_H}px`;
    const ctx = canvas.getContext('2d')!; ctx.scale(scale, scale);

    ctx.fillStyle = tc.bg; ctx.fillRect(0, 0, W, STORY_H);
    ctx.fillStyle = tc.dot;
    for (let x = STORY_PAD; x < W - STORY_PAD; x += 44)
      for (let y = 20; y < STORY_H - 20; y += 44)
        { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill(); }

    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, tc.accent); g.addColorStop(1, tc.accentEnd);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 6);

    const logoSize = 90;
    await loadLogo(ctx, tc, (W - logoSize) / 2, 25, logoSize);
    const ty = 25 + logoSize + 14;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = tc.text; ctx.font = `bold 36px ${opts.fontFamily}`;
    ctx.fillText(trunc(ctx, academy.name.toUpperCase(), W - 2 * STORY_PAD - 40), W / 2, ty);
    ctx.fillStyle = tc.sub; ctx.font = `16px ${opts.fontFamily}`;
    ctx.fillText('HORARIO DE CLASES', W / 2, ty + 44);
    // Month/year pill
    const dateLabel = `${MONTHS_ES[new Date().getMonth()]} ${new Date().getFullYear()}`;
    ctx.font = `600 13px ${opts.fontFamily}`;
    const plW = ctx.measureText(dateLabel).width + 26; const plH = 26;
    const plX = W - STORY_PAD - plW;
    ctx.fillStyle = hexAlpha(tc.accent, 0.15); rr(ctx, plX, 22, plW, plH, plH / 2); ctx.fill();
    ctx.strokeStyle = hexAlpha(tc.accent, 0.4); ctx.lineWidth = 1; rr(ctx, plX, 22, plW, plH, plH / 2); ctx.stroke();
    ctx.fillStyle = tc.accent;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(dateLabel, plX + plW / 2, 22 + plH / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';

    ctx.strokeStyle = tc.sep; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(STORY_PAD, STORY_HEADER_H + 4); ctx.lineTo(W - STORY_PAD, STORY_HEADER_H + 4); ctx.stroke();

    const colW = (W - 2 * STORY_PAD - STORY_COL_GAP) / 2;
    const lx = STORY_PAD, rx = STORY_PAD + colW + STORY_COL_GAP;
    const half = Math.ceil(activeDays.length / 2);

    const drawDaySection = (day: string, x: number, y: number): number => {
      const has = schedules.some((s) => s.dayOfWeek === day);
      ctx.fillStyle = has ? tc.dayActiveBg : tc.dayBg; rr(ctx, x, y, colW, STORY_DAY_H, 8); ctx.fill();
      ctx.fillStyle = has ? tc.dayActiveText : tc.dayText;
      ctx.font = `bold 13px ${opts.fontFamily}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(DAY_LABELS[day], x + colW / 2, y + STORY_DAY_H / 2);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      y += STORY_DAY_H + 6;
      const cards = sortedCards(day);
      cards.forEach((s, j) => drawCard(ctx, tc, x, y + j * (STORY_CARD_H + STORY_CARD_GAP), colW, STORY_CARD_H, s, opts.fontFamily));
      return y + cards.length * (STORY_CARD_H + STORY_CARD_GAP) + 14;
    };

    let ly = STORY_HEADER_H + 22;
    for (const day of activeDays.slice(0, half)) ly = drawDaySection(day, lx, ly);
    let ry = STORY_HEADER_H + 22;
    for (const day of activeDays.slice(half)) ry = drawDaySection(day, rx, ry);

    const footerH = opts.showQr && academy.whatsapp ? 130 : 80;
    const fy = STORY_H - footerH;
    ctx.strokeStyle = tc.sep; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(STORY_PAD, fy - 6); ctx.lineTo(W - STORY_PAD, fy - 6); ctx.stroke();

    if (opts.tagline) {
      const pillFont = `italic 18px ${opts.fontFamily}`;
      ctx.font = pillFont;
      const pillTW = ctx.measureText(opts.tagline).width;
      const pillW = pillTW + 48; const pillH = 36;
      const pillX = (W - pillW) / 2;
      const pillCY = fy - 28;
      ctx.fillStyle = hexAlpha(tc.accent, 0.18); rr(ctx, pillX, pillCY - pillH / 2, pillW, pillH, pillH / 2); ctx.fill();
      ctx.strokeStyle = hexAlpha(tc.accent, 0.45); ctx.lineWidth = 1; rr(ctx, pillX, pillCY - pillH / 2, pillW, pillH, pillH / 2); ctx.stroke();
      ctx.fillStyle = tc.text; ctx.font = pillFont;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(opts.tagline, W / 2, pillCY);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    }

    if (opts.showQr && academy.whatsapp) {
      const qrSize = 80;
      await drawQrBlock(ctx, tc, (W - qrSize) / 2, fy + 10, qrSize);
      drawContactRow(ctx, tc, W / 2, fy + qrSize + 30, igText(), waText(), 14);
    } else {
      drawContactRow(ctx, tc, W / 2, fy + footerH / 2, igText(), waText(), 14);
    }
  }

  // ── Download ─────────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const offscreen = document.createElement('canvas');
      const googleName = currentFont.google;
      if (googleName) await loadGoogleFont(googleName);
      const opts: RO = { theme, format, onlyActiveDays, tagline, showQr, fontFamily: currentFont.family };
      await render(offscreen, 3, opts);
      const now = new Date();
      const a = document.createElement('a');
      a.download = `horario-${MONTHS_LC[now.getMonth()]}-${now.getFullYear()}.png`;
      a.href = offscreen.toDataURL('image/png');
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl shadow-2xl p-5 w-full max-w-3xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Imagen del horario</h2>
            <p className="text-gray-500 text-xs mt-0.5">Personaliza y descarga para compartir en redes</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-xs font-medium mb-1.5">Fuente</p>
            <div className="flex gap-1.5 flex-wrap">
              {FONT_OPTIONS.map((f) => (
                <ToggleBtn key={f.id} active={fontChoice === f.id} onClick={() => setFontChoice(f.id)} label={f.label} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-xs font-medium mb-1.5">Tema</p>
            <div className="flex gap-1.5 flex-wrap">
              <ToggleBtn active={theme === 'dark'}  onClick={() => setTheme('dark')}  label="🌙 Oscuro" />
              <ToggleBtn active={theme === 'light'} onClick={() => setTheme('light')} label="☀️ Claro" />
              <ToggleBtn active={theme === 'brand'} onClick={() => setTheme('brand')} label="🔴 Marca" />
            </div>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-medium mb-1.5">Formato</p>
            <div className="flex gap-1.5">
              <ToggleBtn active={format === 'poster'} onClick={() => setFormat('poster')} label="🖼️ Poster" />
              <ToggleBtn active={format === 'story'}  onClick={() => setFormat('story')}  label="📱 Story" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-gray-400 text-xs font-medium mb-1.5">Texto libre <span className="text-gray-600">(opcional)</span></p>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="ej: ¡Inscripciones abiertas!  ·  Clases para todas las edades"
            maxLength={80}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>

        <div className="flex gap-6 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
            <input type="checkbox" className="accent-primary-500 w-4 h-4" checked={onlyActiveDays} onChange={(e) => setOnlyActiveDays(e.target.checked)} />
            Solo días con clases
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
            <input type="checkbox" className="accent-primary-500 w-4 h-4" checked={showQr} onChange={(e) => setShowQr(e.target.checked)} />
            Incluir QR de WhatsApp
          </label>
        </div>

        <canvas ref={canvasRef} className="hidden" />
        <div className="rounded-xl overflow-hidden border border-gray-700 bg-black relative">
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
              <div className="w-7 h-7 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <img ref={previewRef} className="w-full" alt="Vista previa del horario" />
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors">
            Cerrar
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading || rendering}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {downloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Generando…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar (alta calidad)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

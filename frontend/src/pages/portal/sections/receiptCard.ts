/**
 * Draws the payment receipt as a PNG-ready canvas (bank-ticket look) so it can be shared as an
 * image on WhatsApp. Plain canvas 2D only (no roundRect, no filters) so it also works on the old
 * Android WebView.
 */
export interface ReceiptCardData {
  title: string;                       // "¡Pago exitoso!" / "Comprobante de pago"
  academyName: string | null;
  amount: string;                      // formatted, e.g. "$32.333"
  rows: Array<[string, string]>;       // label → value
  operationId: string | null;
}

const W = 1080;
const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const BG = '#0b101b';
const GREEN = '#16a34a';

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws text shrinking the font until it fits maxW. */
function fitText(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, weight: number, size: number,
  color: string, align: CanvasTextAlign, maxW: number): void {
  let s = size;
  ctx.font = `${weight} ${s}px ${SANS}`;
  while (s > 18 && ctx.measureText(str).width > maxW) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${SANS}`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
}

export function drawReceiptCard(d: ReceiptCardData): HTMLCanvasElement {
  const pad = 70;                       // page margin around the ticket
  const tx = pad, tw = W - pad * 2;     // ticket x / width
  const inner = 70;                     // ticket inner padding
  const headerH = 400;
  const rowsH = d.rows.length * 74;
  const opH = d.operationId ? 170 : 0;
  const ticketH = headerH + 230 + 70 + rowsH + opH + 90;
  const H = ticketH + pad * 2 + 70;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Ticket body (white) with the green header band clipped to its rounded top.
  const ty = pad;
  ctx.save();
  roundedRect(ctx, tx, ty, tw, ticketH, 40);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(tx, ty, tw, ticketH);
  ctx.fillStyle = GREEN;
  ctx.fillRect(tx, ty, tw, headerH);
  ctx.restore();

  // Check badge
  const cx = W / 2, cy = ty + 130;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 32, cy + 2);
  ctx.lineTo(cx - 8, cy + 26);
  ctx.lineTo(cx + 36, cy - 22);
  ctx.stroke();

  fitText(ctx, d.title, cx, ty + 285, 800, 64, '#ffffff', 'center', tw - inner * 2);
  if (d.academyName) fitText(ctx, d.academyName, cx, ty + 350, 500, 38, 'rgba(255,255,255,0.85)', 'center', tw - inner * 2);

  // Amount
  let y = ty + headerH + 90;
  fitText(ctx, 'MONTO PAGADO', cx, y, 600, 30, '#9ca3af', 'center', tw);
  y += 105;
  fitText(ctx, d.amount, cx, y, 800, 110, '#111827', 'center', tw - inner * 2);

  // Perforation: dashed line + notches cut in the page colour
  y += 75;
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 4;
  ctx.setLineDash([16, 14]);
  ctx.beginPath();
  ctx.moveTo(tx + inner, y);
  ctx.lineTo(tx + tw - inner, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = BG;
  [tx, tx + tw].forEach((nx) => { ctx.beginPath(); ctx.arc(nx, y, 30, 0, Math.PI * 2); ctx.fill(); });

  // Detail rows
  y += 90;
  d.rows.forEach(([label, value]) => {
    fitText(ctx, label, tx + inner, y, 400, 36, '#6b7280', 'left', 330);
    fitText(ctx, value, tx + tw - inner, y, 700, 36, '#111827', 'right', tw - inner * 2 - 360);
    y += 74;
  });

  // Operation id box
  if (d.operationId) {
    y += 10;
    ctx.fillStyle = '#f3f4f6';
    roundedRect(ctx, tx + inner, y, tw - inner * 2, 130, 20);
    ctx.fill();
    fitText(ctx, 'N° DE OPERACIÓN', cx, y + 48, 600, 26, '#9ca3af', 'center', tw);
    ctx.font = `700 40px ui-monospace, 'Cascadia Mono', Consolas, monospace`;
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.fillText(d.operationId, cx, y + 100);
  }

  fitText(ctx, 'Comprobante interno de la academia · JJPlatform', cx, H - 60, 500, 28, '#6b7280', 'center', W - 120);
  return canvas;
}

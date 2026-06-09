import type { TrainingSession } from '../../../types';

export interface Insight {
  icon: string;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

const monthKey = (iso: string) => iso.slice(0, 7); // YYYY-MM

function topCount(names: string[]): { name: string; count: number } | null {
  if (names.length === 0) return null;
  const freq = new Map<string, number>();
  for (const n of names) freq.set(n, (freq.get(n) ?? 0) + 1);
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of freq) {
    if (!best || count > best.count) best = { name, count };
  }
  return best;
}

/**
 * Honest, actionable insights over the student's own logged sessions — narrative,
 * not vanity. Only insights with enough data to be meaningful are returned, ordered
 * by relevance. All math is normalized per-session where volume would otherwise skew it.
 */
export function computeInsights(sessions: TrainingSession[]): Insight[] {
  if (sessions.length === 0) return [];

  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;

  const thisMonth = sessions.filter((s) => monthKey(s.date) === thisKey);
  const lastMonth = sessions.filter((s) => monthKey(s.date) === lastKey);

  const out: Insight[] = [];

  // 1. Star submission this month (landed).
  const logradas = thisMonth.flatMap((s) => s.submissions.filter((x) => x.direction === 'LOGRADA').map((x) => x.name));
  const star = topCount(logradas);
  if (star) {
    out.push({ icon: '🏆', tone: 'good', text: `Tu sumisión estrella este mes: ${star.name} (×${star.count}).` });
  }

  // 2. Gi vs No-Gi split this month.
  const gi = thisMonth.filter((s) => s.modality === 'GI').length;
  const nogi = thisMonth.filter((s) => s.modality === 'NOGI').length;
  if (gi + nogi >= 3) {
    const nogiPct = Math.round((nogi / (gi + nogi)) * 100);
    out.push(
      nogiPct >= 50
        ? { icon: '👕', tone: 'neutral', text: `Entrenaste ${nogiPct}% No-Gi este mes.` }
        : { icon: '🥋', tone: 'neutral', text: `Entrenaste ${100 - nogiPct}% Gi este mes.` },
    );
  }

  // 3. Defense trend (submissions received per session, this vs last month).
  const recThis = thisMonth.flatMap((s) => s.submissions.filter((x) => x.direction === 'RECIBIDA')).length;
  const recLast = lastMonth.flatMap((s) => s.submissions.filter((x) => x.direction === 'RECIBIDA')).length;
  if (thisMonth.length > 0 && lastMonth.length > 0 && recLast > 0) {
    const rateThis = recThis / thisMonth.length;
    const rateLast = recLast / lastMonth.length;
    const change = Math.round(((rateThis - rateLast) / rateLast) * 100);
    if (change <= -10) {
      out.push({ icon: '🛡️', tone: 'good', text: `Tu defensa mejoró: te sometieron ${Math.abs(change)}% menos por entreno que el mes pasado.` });
    } else if (change >= 10) {
      out.push({ icon: '🛡️', tone: 'bad', text: `Te sometieron ${change}% más por entreno que el mes pasado — ¡a reforzar la defensa!` });
    }
  }

  // 4. Attack/defense balance this month.
  const logradasCount = logradas.length;
  if (logradasCount + recThis >= 3) {
    if (logradasCount > recThis) {
      out.push({ icon: '⚔️', tone: 'good', text: `Sometiste ${logradasCount} veces y te sometieron ${recThis}. ¡Vas al ataque!` });
    } else {
      out.push({ icon: '⚔️', tone: 'neutral', text: `Este mes: ${logradasCount} logradas · ${recThis} recibidas.` });
    }
  }

  // 5. Volume vs last month.
  if (thisMonth.length > 0) {
    if (lastMonth.length > 0) {
      const delta = thisMonth.length - lastMonth.length;
      const sign = delta > 0 ? `+${delta}` : `${delta}`;
      out.push({
        icon: delta >= 0 ? '📈' : '📉',
        tone: delta >= 0 ? 'good' : 'bad',
        text: `${thisMonth.length} entrenos este mes (${sign} vs el mes pasado).`,
      });
    } else {
      out.push({ icon: '📈', tone: 'neutral', text: `${thisMonth.length} entrenos este mes. ¡Sigue así!` });
    }
  }

  // 6. Most-worked technique this month.
  const tech = topCount(thisMonth.flatMap((s) => s.techniques));
  if (tech && tech.count >= 2) {
    out.push({ icon: '🔧', tone: 'neutral', text: `Más trabajaste: ${tech.name} (×${tech.count}).` });
  }

  // 7. Most frequent training partner this month.
  const partner = topCount(thisMonth.flatMap((s) => s.partners.map((p) => p.name)));
  if (partner && partner.count >= 2) {
    out.push({ icon: '🤝', tone: 'neutral', text: `Tu compañero de tatami este mes: ${partner.name} (×${partner.count}).` });
  }

  return out.slice(0, 6);
}

import { Capacitor, registerPlugin } from '@capacitor/core';

interface BeltIconPlugin {
  setBelt(options: { belt: string }): Promise<void>;
}

const BeltIcon = registerPlugin<BeltIconPlugin>('BeltIcon');

const BELT_ORDER = ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK'];

const BELT_MAP: Record<string, string> = {
  // English
  white: 'WHITE', blue: 'BLUE', purple: 'PURPLE', brown: 'BROWN', black: 'BLACK',
  // Spanish
  blanco: 'WHITE', azul: 'BLUE', morado: 'PURPLE',
  café: 'BROWN', cafe: 'BROWN', marrón: 'BROWN', marron: 'BROWN',
  negro: 'BLACK',
};

function normalizeBelt(belt: string | null | undefined): string {
  if (!belt) return 'WHITE';
  return BELT_MAP[belt.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')] ?? 'WHITE';
}

export function highestBelt(disciplines: Array<{ belt: string | null }>): string {
  let bestIdx = 0;
  for (const d of disciplines) {
    const idx = BELT_ORDER.indexOf(normalizeBelt(d.belt));
    if (idx > bestIdx) bestIdx = idx;
  }
  return BELT_ORDER[bestIdx];
}

export async function applyBeltIcon(disciplines: Array<{ belt: string | null }>): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const belt = highestBelt(disciplines);
  try {
    await BeltIcon.setBelt({ belt });
  } catch {
    // non-fatal — icono permanece igual
  }
}

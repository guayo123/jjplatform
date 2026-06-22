import { Capacitor, registerPlugin } from '@capacitor/core';

interface BeltIconPlugin {
  setBelt(options: { belt: string }): Promise<void>;
}

const BeltIcon = registerPlugin<BeltIconPlugin>('BeltIcon');

const BELT_ORDER = ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK'];

export function highestBelt(disciplines: Array<{ belt: string | null }>): string {
  let bestIdx = 0;
  for (const d of disciplines) {
    const idx = BELT_ORDER.indexOf(d.belt?.toUpperCase() ?? 'WHITE');
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

import { forwardRef, useId, type ReactElement } from 'react';
import { IconBase, type IconProps, type IconWeight } from '@phosphor-icons/react';

/**
 * Kimono de jiu-jitsu (gi). Phosphor no trae un icono de grappling, asi que este se dibuja a
 * medida con el mismo trazo y soporta los mismos pesos, para usarse igual que cualquier otro icono.
 */
const BODY = 'M96 36 48 60 20 124 56 140 72 108V220H184V108L200 140 236 124 208 60 160 36Z';
const DETAILS = 'M96 36 128 108 160 36M72 160H184M128 160V220';

const STROKE: Record<Exclude<IconWeight, 'fill'>, number> = { thin: 8, light: 12, regular: 16, bold: 24, duotone: 16 };

function build(weight: IconWeight, maskId: string): ReactElement {
  if (weight === 'fill') {
    return (
      <>
        <mask id={maskId}>
          <rect width="256" height="256" fill="white" />
          <path d={DETAILS} fill="none" stroke="black" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
        </mask>
        <path d={BODY} fill="currentColor" stroke="currentColor" strokeWidth={12} strokeLinejoin="round" mask={`url(#${maskId})`} />
      </>
    );
  }
  const w = STROKE[weight];
  return (
    <g fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      {weight === 'duotone' && <path d={BODY} fill="currentColor" fillOpacity={0.2} stroke="none" />}
      <path d={BODY} />
      <path d={DETAILS} />
    </g>
  );
}

const GiIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => {
  const maskId = useId();
  const weights = new Map<IconWeight, ReactElement>(
    (['thin', 'light', 'regular', 'bold', 'fill', 'duotone'] as IconWeight[]).map((w) => [w, build(w, maskId)]),
  );
  return <IconBase ref={ref} {...props} weights={weights} />;
});
GiIcon.displayName = 'GiIcon';

export default GiIcon;

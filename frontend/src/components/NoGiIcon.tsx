import { forwardRef, type ReactElement } from 'react';
import { IconBase, type IconProps, type IconWeight } from '@phosphor-icons/react';

/**
 * Conjunto de No-Gi: rashguard de manga larga y shorts de grappling. Va a juego con GiIcon
 * (mismo trazo y mismos pesos) para distinguir las clases sin kimono.
 */
const TOP = 'M98 24C106 40 150 40 158 24L196 40 216 104 192 110 178 78V116H78V78L64 110 40 104 60 40Z';
const SHORTS = 'M78 148H178L196 230H140L128 180 116 230H60Z';

const STROKE: Record<Exclude<IconWeight, 'fill'>, number> = { thin: 8, light: 12, regular: 16, bold: 24, duotone: 16 };

function build(weight: IconWeight): ReactElement {
  if (weight === 'fill') {
    return (
      <g fill="currentColor" stroke="currentColor" strokeWidth={12} strokeLinejoin="round">
        <path d={TOP} />
        <path d={SHORTS} />
      </g>
    );
  }
  return (
    <g fill="none" stroke="currentColor" strokeWidth={STROKE[weight]} strokeLinecap="round" strokeLinejoin="round">
      {weight === 'duotone' && (
        <>
          <path d={TOP} fill="currentColor" fillOpacity={0.2} stroke="none" />
          <path d={SHORTS} fill="currentColor" fillOpacity={0.2} stroke="none" />
        </>
      )}
      <path d={TOP} />
      <path d={SHORTS} />
    </g>
  );
}

const WEIGHTS = new Map<IconWeight, ReactElement>(
  (['thin', 'light', 'regular', 'bold', 'fill', 'duotone'] as IconWeight[]).map((w) => [w, build(w)]),
);

const NoGiIcon = forwardRef<SVGSVGElement, IconProps>((props, ref) => <IconBase ref={ref} {...props} weights={WEIGHTS} />);
NoGiIcon.displayName = 'NoGiIcon';

export default NoGiIcon;

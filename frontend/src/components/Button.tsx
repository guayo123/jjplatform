import { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'solid' | 'outline' | 'strike' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const CLIP_PATH = 'polygon(0 0, 100% 0, 100% calc(100% - 9px), calc(100% - 9px) 100%, 0 100%)';

const BASE =
  'inline-flex items-center justify-center gap-2 font-bold uppercase tracking-widest transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed select-none';

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-4 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3 text-base',
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  solid:
    'bg-[#1C1C1E] border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10 hover:shadow-[0_0_18px_rgba(201,168,76,0.35)]',
  outline:
    'bg-transparent border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/[0.08] hover:shadow-[0_0_14px_rgba(201,168,76,0.25)]',
  strike:
    'bg-[#5C0A0A] border border-[#8B1A1A] text-red-300 hover:bg-[#6B0F0F] hover:shadow-[0_0_14px_rgba(139,26,26,0.5)]',
  ghost:
    'bg-transparent text-[#C9A84C] hover:text-[#E0C068] hover:underline underline-offset-2',
};

const HAS_CLIP: Record<ButtonVariant, boolean> = {
  solid: true,
  outline: true,
  strike: true,
  ghost: false,
};

export default function Button({
  variant = 'solid',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`${BASE} ${SIZES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      style={HAS_CLIP[variant] ? { clipPath: CLIP_PATH, ...style } : style}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
      )}
      {children}
    </button>
  );
}

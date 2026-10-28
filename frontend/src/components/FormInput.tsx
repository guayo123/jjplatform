import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

// A width or padding passed in className replaces the default instead of fighting it (Tailwind's CSS order would win).
const has = (className: string | undefined, prefix: string) => new RegExp(`(^|\\s)${prefix}-`).test(className ?? '');

export default function FormInput({ error, className, ...props }: Props) {
  const width = has(className, 'w') ? '' : 'w-full';
  const padding = `${has(className, 'px') ? '' : 'px-3'} ${has(className, 'py') ? '' : 'py-2.5'}`;
  return (
    <input
      {...props}
      className={`${width} bg-gray-900 border ${error ? 'border-red-500' : 'border-gray-700'} text-white text-sm rounded-lg ${padding} outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ''}`}
    />
  );
}

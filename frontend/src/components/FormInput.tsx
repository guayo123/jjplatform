import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export default function FormInput({ error, className, ...props }: Props) {
  return (
    <input
      {...props}
      className={`w-full bg-gray-900 border ${error ? 'border-red-500' : 'border-gray-700'} text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ''}`}
    />
  );
}

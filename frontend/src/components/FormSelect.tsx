import type { SelectHTMLAttributes } from 'react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export default function FormSelect({ error, className, children, ...props }: Props) {
  return (
    <select
      {...props}
      className={`w-full bg-gray-900 border ${error ? 'border-red-500' : 'border-gray-700'} text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed appearance-none ${className ?? ''}`}
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem', paddingRight: '2.5rem', ...props.style }}
    >
      {children}
    </select>
  );
}

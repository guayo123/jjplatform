import type { TextareaHTMLAttributes } from 'react';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export default function FormTextarea({ error, className, ...props }: Props) {
  return (
    <textarea
      {...props}
      className={`w-full bg-gray-900 border ${error ? 'border-red-500' : 'border-gray-700'} text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors placeholder:text-gray-500 resize-none disabled:opacity-50 ${className ?? ''}`}
    />
  );
}

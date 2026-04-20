import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Toast from './Toast';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++nextId.current;
    setItems((prev) => [...prev, { id, message, type }]);
  }, []);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error'),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast message={t.message} type={t.type} onClose={() => remove(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

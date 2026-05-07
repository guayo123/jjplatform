import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  max?: string;
  min?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

const DAYS_SHORT = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseYMD(s: string): { year: number; month: number; day: number } | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function todayYMD(): string {
  const now = new Date();
  return toYMD(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDisplay(s: string): string {
  const parts = parseYMD(s);
  if (!parts) return '';
  const { year, month, day } = parts;
  return new Date(year, month, day).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export default function DatePicker({ value, onChange, max, min, required, placeholder = 'Seleccionar fecha', className }: Props) {
  const [open, setOpen] = useState(false);
  const [yearPicker, setYearPicker] = useState(false);

  const today = todayYMD();
  const parsed = parseYMD(value);

  const initYear = parsed?.year ?? new Date().getFullYear();
  const initMonth = parsed?.month ?? new Date().getMonth();
  const [cursorYear, setCursorYear] = useState(initYear);
  const [cursorMonth, setCursorMonth] = useState(initMonth);

  const ref = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = parseYMD(value);
    if (p) { setCursorYear(p.year); setCursorMonth(p.month); }
  }, [value]);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  useEffect(() => {
    if (yearPicker && yearListRef.current) {
      const selected = yearListRef.current.querySelector('[data-selected="true"]');
      if (selected) selected.scrollIntoView({ block: 'center' });
    }
  }, [yearPicker]);

  const isDisabled = (ymd: string) => {
    if (max && ymd > max) return true;
    if (min && ymd < min) return true;
    return false;
  };

  const select = (day: number) => {
    const ymd = toYMD(cursorYear, cursorMonth, day);
    if (isDisabled(ymd)) return;
    onChange(ymd);
    setOpen(false);
  };

  const prevMonth = () => {
    if (cursorMonth === 0) { setCursorYear(y => y - 1); setCursorMonth(11); }
    else setCursorMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (cursorMonth === 11) { setCursorYear(y => y + 1); setCursorMonth(0); }
    else setCursorMonth(m => m + 1);
  };

  const leadingEmpties = firstDayOfWeek(cursorYear, cursorMonth);
  const totalDays = daysInMonth(cursorYear, cursorMonth);
  const cells: Array<number | null> = [
    ...Array(leadingEmpties).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const minYear = min ? parseInt(min.slice(0, 4)) : 1990;
  const maxYear = max ? parseInt(max.slice(0, 4)) : new Date().getFullYear();
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setYearPicker(false); }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all text-left
          ${open
            ? 'border-primary-500 bg-gray-950 ring-2 ring-primary-500/30 text-white'
            : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500'
          }`}
      >
        <svg className="w-4 h-4 flex-shrink-0 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={value ? 'text-white font-medium' : 'text-gray-500'}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <svg className={`w-4 h-4 ml-auto text-gray-500 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {required && <input type="hidden" value={value} required />}

      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-gray-950 border border-gray-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-center">
              <p className="text-sm font-black uppercase tracking-widest text-white">{MONTHS[cursorMonth]}</p>
              <button
                type="button"
                onClick={() => setYearPicker((v) => !v)}
                className={`text-xs font-bold tracking-widest transition-colors ${yearPicker ? 'text-white' : 'text-primary-400 hover:text-primary-300'}`}
              >
                {cursorYear} {yearPicker ? '▲' : '▼'}
              </button>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {yearPicker ? (
            <div ref={yearListRef} className="grid grid-cols-4 p-3 gap-1 max-h-52 overflow-y-auto">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  data-selected={y === cursorYear}
                  onClick={() => { setCursorYear(y); setYearPicker(false); }}
                  className={`py-2 text-sm font-semibold rounded-lg transition-colors
                    ${y === cursorYear
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                >
                  {y}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 px-3 pt-3 pb-1">
                {DAYS_SHORT.map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-gray-600 pb-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
                {cells.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;
                  const dStr = toYMD(cursorYear, cursorMonth, day);
                  const isSelected = dStr === value;
                  const isToday = dStr === today;
                  const disabled = isDisabled(dStr);
                  return (
                    <button
                      key={dStr}
                      type="button"
                      disabled={disabled}
                      onClick={() => select(day)}
                      className={`relative h-9 w-full flex items-center justify-center text-sm font-semibold rounded-lg transition-all
                        ${isSelected
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/40'
                          : isToday
                            ? 'text-primary-300 ring-1 ring-primary-500/60 hover:bg-primary-500/20'
                            : disabled
                              ? 'text-gray-700 cursor-not-allowed'
                              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`}
                    >
                      {day}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {!isDisabled(today) && (
                <div className="border-t border-gray-800 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      const t = parseYMD(today)!;
                      setCursorYear(t.year);
                      setCursorMonth(t.month);
                      onChange(today);
                      setOpen(false);
                    }}
                    className="w-full text-xs font-bold text-primary-400 hover:text-primary-300 py-1.5 rounded-lg hover:bg-primary-500/10 transition-colors tracking-wide uppercase"
                  >
                    Hoy
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

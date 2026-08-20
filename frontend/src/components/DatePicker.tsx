import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function key(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseKey(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Date picker that replaces the browser's native `input[type=date]` popup so
 * the control matches the app theme. Value is a YYYY-MM-DD string.
 */
export function DatePicker({
  value,
  onChange,
  label,
  className = '',
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseKey(value) : new Date();
  const [view, setView] = useState({ y: selected.getFullYear(), m: selected.getMonth() });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setView({ y: selected.getFullYear(), m: selected.getMonth() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(view.y, view.m, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { date, k: key(date), outside: date.getMonth() !== view.m };
    });
  }, [view.y, view.m]);

  const move = (delta: number) =>
    setView((prev) => {
      const d = new Date(prev.y, prev.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const realToday = key(new Date());
  const display = value
    ? parseKey(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Pick a date';

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        className="tc-datefield"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ? `${label}: ${display}` : display}
      >
        <Icon name="calendar_today" size={15} />
        <span className="tc-datefield-value">{display}</span>
        <Icon name="expand_more" size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="tc-datepop" role="dialog" aria-label={label || 'Choose date'}>
          <div className="tc-datepop-head">
            <button type="button" className="tc-icon-btn !w-8 !h-8" onClick={() => move(-1)} aria-label="Previous month">
              <Icon name="chevron_left" size={16} />
            </button>
            <div className="tc-datepop-title">
              <span>{MONTHS[view.m]}</span>
              <span className="font-mono text-ink-muted">{view.y}</span>
            </div>
            <button type="button" className="tc-icon-btn !w-8 !h-8" onClick={() => move(1)} aria-label="Next month">
              <Icon name="chevron_right" size={16} />
            </button>
          </div>

          <div className="tc-datepop-grid">
            {DOW.map((d) => (
              <span key={d} className="tc-datepop-dow">{d}</span>
            ))}
            {cells.map(({ date, k, outside }) => (
              <button
                key={k}
                type="button"
                className={`tc-datepop-day ${outside ? 'is-outside' : ''} ${k === value ? 'is-selected' : ''} ${k === realToday ? 'is-today' : ''}`}
                onClick={() => { onChange(k); setOpen(false); }}
                aria-pressed={k === value}
                aria-label={date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              >
                {date.getDate()}
              </button>
            ))}
          </div>

          <div className="tc-datepop-foot">
            <button
              type="button"
              className="tc-datepop-link"
              onClick={() => { onChange(realToday); setOpen(false); }}
            >
              Reset to real today
            </button>
            <button type="button" className="tc-datepop-link" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

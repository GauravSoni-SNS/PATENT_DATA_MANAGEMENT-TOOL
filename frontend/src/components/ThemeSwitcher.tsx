import { useEffect, useRef, useState } from 'react';
import { THEMES, useTheme } from '../context/ThemeContext';
import { Icon } from './Icon';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = THEMES.find((t) => t.id === theme) || THEMES[0];

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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="btn btn-sm tc-btn-quiet tc-btn gap-1.5"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}`}
      >
        <Icon name="palette" size={18} filled />
        <span className="hidden md:inline">{current.label}</span>
        <Icon name="expand_more" size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="tc-menu-pop" role="menu" aria-label="Choose theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitemradio"
              aria-checked={t.id === theme}
              className={`tc-menu-item ${t.id === theme ? 'is-active' : ''}`}
              onClick={() => { setTheme(t.id); setOpen(false); }}
            >
              <span className="tc-swatch" style={{ background: t.swatch }} />
              <Icon name={t.icon} size={17} filled={t.id === theme} />
              <span className="flex-1 text-left">{t.label}</span>
              {t.id === theme && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

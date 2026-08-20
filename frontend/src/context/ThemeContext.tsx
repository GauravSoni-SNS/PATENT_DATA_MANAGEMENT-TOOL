import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export const THEMES = [
  { id: 'sage', label: 'Sage', icon: 'eco', swatch: '#3F6B33' },
  { id: 'terracotta', label: 'Terracotta', icon: 'local_fire_department', swatch: '#C56A3C' },
  { id: 'midnight', label: 'Midnight', icon: 'dark_mode', swatch: '#7CC262' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

const STORAGE_KEY = 'lexpatent-theme';
const DEFAULT: ThemeId = 'sage';

function isTheme(v: string | null): v is ThemeId {
  return !!v && THEMES.some((t) => t.id === v);
}

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

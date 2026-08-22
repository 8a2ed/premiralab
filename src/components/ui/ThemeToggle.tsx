import { useState, useEffect } from 'react';
import { getInitialTheme, applyTheme } from '../../lib/utils.js';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <button
      className="btn btn--icon theme-toggle"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
      title={theme === 'dark' ? 'وضع فاتح' : 'وضع داكن'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

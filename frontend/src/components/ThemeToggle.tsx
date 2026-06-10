'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/** Light/dark theme toggle, persisted in localStorage and applied to <html>. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = (localStorage.getItem('rocket-theme') as 'dark' | 'light' | null) ?? 'dark';
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('rocket-theme', next);
  }

  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        color: 'var(--text)',
        cursor: 'pointer',
        padding: '0.4rem',
      }}
      className="inline-flex items-center"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const getIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'system':
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
        aria-label="Toggle theme"
      >
        {getIcon()}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <button
            onClick={() => {
              setTheme('light');
              setIsOpen(false);
            }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
              theme === 'light'
                ? 'bg-cyan-50 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Sun className="h-4 w-4" />
            Light
          </button>
          <button
            onClick={() => {
              setTheme('dark');
              setIsOpen(false);
            }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
              theme === 'dark'
                ? 'bg-cyan-50 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Moon className="h-4 w-4" />
            Dark
          </button>
          <button
            onClick={() => {
              setTheme('system');
              setIsOpen(false);
            }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
              theme === 'system'
                ? 'bg-cyan-50 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Monitor className="h-4 w-4" />
            System
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { ThemePreference, useTheme } from '@/app/lib/theme';

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Auto', icon: Monitor },
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
];

/** Navbar (large screens): one button cycling Auto → Clair → Sombre */
export function ThemeToggleButton({ className = '' }: { className?: string }) {
  const { preference, setPreference, mounted } = useTheme();
  const index = OPTIONS.findIndex((o) => o.value === preference);
  const current = OPTIONS[index];
  const next = OPTIONS[(index + 1) % OPTIONS.length];
  const Icon = current.icon;

  return (
    <button
      type="button"
      onClick={() => setPreference(next.value)}
      className={`flex items-center justify-center p-2 text-gray-700 hover:text-[#00aeee] dark:text-gray-300 dark:hover:text-[#33c2f3] transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
      aria-label={`Thème : ${current.label}. Passer en ${next.label.toLowerCase()}`}
      title={`Thème : ${current.label} (cliquer pour ${next.label.toLowerCase()})`}
    >
      {/* Same icon on server and first render, the real one once the saved choice is read */}
      {mounted ? <Icon className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
    </button>
  );
}

/** Sidebar (phones): the three choices side by side */
export function ThemeSwitcher() {
  const { preference, setPreference, mounted } = useTheme();

  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
        Apparence
      </p>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800" role="radiogroup" aria-label="Thème">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = mounted && preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPreference(value)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-white text-black shadow-sm dark:bg-black dark:text-white'
                  : 'text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white'
              }`}
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-[#00aeee]' : ''}`} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

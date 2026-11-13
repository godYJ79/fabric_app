import { Menu, Moon, Sun, X } from 'lucide-react';

import { useTheme } from '@/hooks/theme.context';
import type { CurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';

export function AppHeader({
  user,
  navOpen,
  onToggleNav,
}: {
  readonly user: CurrentUser;
  readonly navOpen: boolean;
  readonly onToggleNav: () => void;
}) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <header className="hero-surface shrink-0">
      <div className="flex items-center justify-between gap-300 px-400 py-400 lg:px-600">
        <div className="flex min-w-0 items-center gap-200">
          <button
            type="button"
            onClick={onToggleNav}
            aria-label={navOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={navOpen}
            aria-controls="main-nav"
            className="rounded-full p-200 text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:hidden"
          >
            {navOpen ? (
              <X aria-hidden="true" className="icon-size-300" />
            ) : (
              <Menu aria-hidden="true" className="icon-size-300" />
            )}
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-500 font-bold tracking-tight text-white">데이터 포털</h1>
            <p className="mt-100 truncate text-200 text-white/70">
              <span className="font-medium text-white/90">{user.email}</span>
              <span
                className={cn(
                  'ml-200 rounded-full border px-300 py-100-nudge font-monospace',
                  user.isStaff
                    ? 'border-white/40 bg-white/20 text-white'
                    : 'border-white/25 bg-white/10 text-white/80'
                )}
              >
                {user.isStaff ? '담당자' : '요청자'}
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? '밝은 화면으로 전환' : '어두운 화면으로 전환'}
          className="shrink-0 rounded-full p-200 text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {isDark ? (
            <Sun aria-hidden="true" className="icon-size-300" />
          ) : (
            <Moon aria-hidden="true" className="icon-size-300" />
          )}
        </button>
      </div>
    </header>
  );
}

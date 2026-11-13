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
    <header className="shrink-0 border-b border-border bg-background">
      <div className="flex items-center justify-between gap-300 px-400 py-300">
        <div className="flex min-w-0 items-center gap-200">
          <button
            type="button"
            onClick={onToggleNav}
            aria-label={navOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={navOpen}
            aria-controls="main-nav"
            className="rounded-lg p-200 text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            {navOpen ? (
              <X aria-hidden="true" className="icon-size-300" />
            ) : (
              <Menu aria-hidden="true" className="icon-size-300" />
            )}
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-500 font-semibold text-foreground">데이터 포털</h1>
            <p className="truncate text-200 text-muted-foreground">
              <span className="font-medium text-foreground">{user.email}</span>
              <span
                className={cn(
                  'ml-200 rounded-md border px-200 py-100-nudge font-monospace',
                  user.isStaff
                    ? 'border-primary/40 bg-accent text-accent-foreground'
                    : 'border-border bg-muted text-muted-foreground'
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
          className="shrink-0 rounded-lg p-200 text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

import { BookMarked, BookOpen, ChevronDown, ChevronRight, Inbox, Sigma, Type } from 'lucide-react';
import type { ComponentType } from 'react';

import { KIND_LABEL } from '@/lib/dictionary';
import { isStandardView, STANDARD_VIEWS, type StandardView, type View } from '@/lib/route';
import { cn } from '@/lib/utils';

const STANDARD_ICON: Record<StandardView, ComponentType<{ className?: string; 'aria-hidden'?: 'true' }>> = {
  words: Type,
  terms: BookMarked,
  formulas: Sigma,
};

const itemClass = (active: boolean) =>
  cn(
    'flex w-full items-center gap-200 rounded-lg px-300 py-200 text-left text-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active
      ? 'bg-accent font-semibold text-accent-foreground'
      : 'font-medium text-foreground hover:bg-accent'
  );

export interface SidebarProps {
  readonly view: View;
  /** On narrow screens the menu is a panel that opens under the header. */
  readonly open: boolean;
  readonly onNavigate: (view: View) => void;
}

export function Sidebar({ view, open, onNavigate }: SidebarProps) {
  const standardsActive = isStandardView(view);
  return (
    <aside
      id="main-nav"
      className={cn(
        'shrink-0 border-border bg-card lg:block lg:w-64 lg:overflow-y-auto lg:border-r',
        open ? 'block border-b' : 'hidden'
      )}
    >
      <nav aria-label="주 메뉴" className="p-300">
        <ul className="space-y-100">
          <li>
            <button
              type="button"
              aria-current={view === 'requests' ? 'page' : undefined}
              onClick={() => onNavigate('requests')}
              className={itemClass(view === 'requests')}
            >
              <Inbox aria-hidden="true" className="icon-size-300 shrink-0" />
              데이터 요청
            </button>
          </li>
          <li>
            <button
              type="button"
              // The sub-menu has an item with the same visible name; keep the two distinguishable.
              aria-label="표준 용어 메뉴"
              aria-expanded={standardsActive}
              aria-controls="standards-menu"
              onClick={() => onNavigate(standardsActive ? view : 'words')}
              className={itemClass(standardsActive)}
            >
              <BookOpen aria-hidden="true" className="icon-size-300 shrink-0" />
              <span className="flex-1">표준 용어</span>
              {standardsActive ? (
                <ChevronDown aria-hidden="true" className="icon-size-200 shrink-0" />
              ) : (
                <ChevronRight aria-hidden="true" className="icon-size-200 shrink-0" />
              )}
            </button>
            {standardsActive ? (
              <ul id="standards-menu" className="ml-400 mt-100 space-y-100 border-l border-border pl-200">
                {STANDARD_VIEWS.map((child) => {
                  const Icon = STANDARD_ICON[child];
                  return (
                    <li key={child}>
                      <button
                        type="button"
                        aria-current={view === child ? 'page' : undefined}
                        onClick={() => onNavigate(child)}
                        className={itemClass(view === child)}
                      >
                        <Icon aria-hidden="true" className="icon-size-200 shrink-0" />
                        {KIND_LABEL[child]}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        </ul>
      </nav>
    </aside>
  );
}

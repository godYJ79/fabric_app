import {
  BookMarked,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChartColumn,
  Globe,
  Inbox,
  LayoutDashboard,
  Sigma,
  Type,
} from 'lucide-react';
import type { ComponentType } from 'react';

import { isDashboardView, isStandardView, VIEW_LABEL, type View } from '@/lib/route';
import { cn } from '@/lib/utils';

type Icon = ComponentType<{ className?: string; 'aria-hidden'?: 'true' }>;

const VIEW_ICON: Record<View, Icon> = {
  requests: Inbox,
  words: Type,
  terms: BookMarked,
  formulas: Sigma,
  lng: Globe,
  sales: ChartColumn,
};

interface Group {
  key: string;
  label: string;
  /** Accessible name when it would otherwise repeat the name of one of its items. */
  ariaLabel?: string;
  icon: Icon;
  views: readonly View[];
  isActive: (view: View) => boolean;
}

const GROUPS: readonly Group[] = [
  {
    key: 'standards',
    label: '표준 용어',
    // A sub-menu item has the same visible name; keep the two distinguishable.
    ariaLabel: '표준 용어 메뉴',
    icon: BookOpen,
    views: ['words', 'terms', 'formulas'],
    isActive: isStandardView,
  },
  {
    key: 'dashboards',
    label: '대시보드',
    icon: LayoutDashboard,
    views: ['lng', 'sales'],
    isActive: isDashboardView,
  },
];

const itemClass = (active: boolean, soft = false) =>
  cn(
    'flex w-full items-center gap-200 rounded-full px-400 py-200 text-left text-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active
      ? soft
        ? 'bg-accent font-semibold text-accent-foreground'
        : 'bg-primary font-semibold text-primary-foreground'
      : 'font-medium text-foreground hover:bg-accent'
  );

export interface SidebarProps {
  readonly view: View;
  /** On narrow screens the menu is a panel that opens under the header. */
  readonly open: boolean;
  readonly onNavigate: (view: View) => void;
}

export function Sidebar({ view, open, onNavigate }: SidebarProps) {
  const RequestsIcon = VIEW_ICON.requests;
  return (
    <aside
      id="main-nav"
      className={cn(
        'shrink-0 border-border bg-card lg:block lg:w-72 lg:overflow-y-auto lg:border-r',
        open ? 'block border-b' : 'hidden'
      )}
    >
      <nav aria-label="주 메뉴" className="p-400">
        <ul className="space-y-100">
          <li>
            <button
              type="button"
              aria-current={view === 'requests' ? 'page' : undefined}
              onClick={() => onNavigate('requests')}
              className={itemClass(view === 'requests')}
            >
              <RequestsIcon aria-hidden="true" className="icon-size-300 shrink-0" />
              {VIEW_LABEL.requests}
            </button>
          </li>
          {GROUPS.map((group) => {
            const active = group.isActive(view);
            const GroupIcon = group.icon;
            const menuId = `${group.key}-menu`;
            return (
              <li key={group.key}>
                <button
                  type="button"
                  aria-label={group.ariaLabel}
                  aria-expanded={active}
                  aria-controls={menuId}
                  onClick={() => onNavigate(active ? view : group.views[0])}
                  className={itemClass(active, true)}
                >
                  <GroupIcon aria-hidden="true" className="icon-size-300 shrink-0" />
                  <span className="flex-1">{group.label}</span>
                  {active ? (
                    <ChevronDown aria-hidden="true" className="icon-size-200 shrink-0" />
                  ) : (
                    <ChevronRight aria-hidden="true" className="icon-size-200 shrink-0" />
                  )}
                </button>
                {active ? (
                  <ul id={menuId} className="ml-400 mt-100 space-y-100 border-l border-border pl-200">
                    {group.views.map((child) => {
                      const ChildIcon = VIEW_ICON[child];
                      return (
                        <li key={child}>
                          <button
                            type="button"
                            aria-current={view === child ? 'page' : undefined}
                            onClick={() => onNavigate(child)}
                            className={itemClass(view === child)}
                          >
                            <ChildIcon aria-hidden="true" className="icon-size-200 shrink-0" />
                            {VIEW_LABEL[child]}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

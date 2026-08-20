'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Home' },
  { href: '/sets', label: 'Profile' },
] as const;

/**
 * Two destinations, because that's how many this app actually has. Landing on
 * "/" always shows a fresh drop zone — there's no separate "upload" state to
 * point a third tab at, so building one would just be a second Home button.
 *
 * Fixed to the bottom rather than a top bar: this app is read on a phone as
 * often as a laptop, and a thumb reaches the bottom of the screen without the
 * hand moving.
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-line bg-surface/90 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-5xl mx-auto flex">
        {TABS.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex-1 text-center py-4 label transition-colors ${
                active ? 'text-text' : 'text-muted hover:text-text'
              }`}
            >
              {active && <span className="absolute top-0 inset-x-0 h-[2px] bg-text" />}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

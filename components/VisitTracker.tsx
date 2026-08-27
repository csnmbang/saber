'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Logs every page a browser lands on, mounted once at the root layout so it
 * covers every route — the homepage, an example, a saved set — without each
 * page having to remember to call it.
 *
 * Fires on mount and on every path change. Nothing on the page waits on it,
 * and it never throws into the page it's tracking.
 */
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/visit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}

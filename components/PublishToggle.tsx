'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackPublish } from '@/lib/analytics';

/**
 * Publishing is a separate, later, explicit action, and the copy says exactly
 * what changes hands rather than leaving a DJ to find out.
 */
export function PublishToggle({ id, isPublic }: { id: string; isPublic: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function set(next: boolean) {
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/sets/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isPublic: next }),
      });
      if (!response.ok) throw new Error('failed');
      trackPublish({ isPublic: next });
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/set/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (isPublic) {
    return (
      <section className="border border-line bg-surface p-5">
        <p className="label">Published</p>
        <p className="mt-2 text-[13px]">
          Anyone with the link can open this page, tracklist included.
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={copyLink}
            className="btn-quiet"
          >
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={() => set(false)}
            disabled={pending}
            className="btn-quiet"
          >
            {pending ? 'Unpublishing' : 'Unpublish'}
          </button>
        </div>
        {failed && <p className="mt-3 text-[13px]">That did not go through. Try again.</p>}
      </section>
    );
  }

  return (
    <section className="border border-line bg-surface p-5">
      <p className="label">Only you can open this</p>
      <p className="mt-2 text-[13px]">
        Publishing puts this at a link anyone can open: the readings, the rings, and every track
        below. Unpublish anytime.
      </p>
      <button
        type="button"
        onClick={() => set(true)}
        disabled={pending}
        className="btn mt-4"
      >
        {pending ? 'Publishing' : 'Publish set'}
      </button>
      {failed && <p className="mt-3 text-[13px]">That did not go through. Try again.</p>}
    </section>
  );
}

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
            className="label border border-line px-4 py-2 hover:border-text hover:text-text"
          >
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={() => set(false)}
            disabled={pending}
            className="label border border-line px-4 py-2 hover:border-text hover:text-text disabled:opacity-50"
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
        Publishing puts this page at a link anyone can open. That means the archetype, the four
        readings, the rings, and every track title and artist below. Unpublishing takes it back
        immediately.
      </p>
      <button
        type="button"
        onClick={() => set(true)}
        disabled={pending}
        className="label mt-4 border border-line px-4 py-2 hover:border-text hover:text-text disabled:opacity-50"
      >
        {pending ? 'Publishing' : 'Publish set'}
      </button>
      {failed && <p className="mt-3 text-[13px]">That did not go through. Try again.</p>}
    </section>
  );
}

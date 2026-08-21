'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Deleting a set, not unpublishing it. Publish/unpublish is reversible and
 * gets no confirmation step for exactly that reason — this is the one
 * irreversible action a saved set has, so it gets the one confirmation step
 * in the app: a plain click reveals the real button, rather than a native
 * confirm() dialog that looks nothing like the rest of the page.
 */
export function DeleteSet({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function remove() {
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/sets/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('failed');
      router.push('/sets');
      router.refresh();
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="btn-quiet">
        Delete this set
      </button>
    );
  }

  return (
    <div className="border border-line bg-surface p-5">
      <p className="text-[13px]">
        This removes the set and its tracklist for good. There is no undo.
      </p>
      <div className="mt-4 flex flex-wrap gap-4">
        <button type="button" onClick={remove} disabled={pending} className="btn-quiet">
          {pending ? 'Deleting' : 'Delete for good'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="btn-quiet"
        >
          Cancel
        </button>
      </div>
      {failed && <p className="mt-3 text-[13px]">That did not go through. Try again.</p>}
    </div>
  );
}

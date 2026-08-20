'use client';

import { useRef, useState } from 'react';

export function DropZone({ onFile }: { onFile: (file: File) => void }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={`border border-dashed p-12 text-center transition-colors ${
        over ? 'border-text bg-surface' : 'border-line'
      }`}
    >
      <p className="text-base">Drop a rekordbox .txt export</p>
      <p className="text-muted mt-1 text-[13px]">
        File &gt; Export a playlist to a file. History playlists work too.
      </p>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="btn mt-6"
      >
        Choose a file
      </button>
      <input
        ref={input}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

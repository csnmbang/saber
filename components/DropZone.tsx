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
      <ol className="text-muted mt-3 text-[13px] space-y-1 list-decimal list-inside">
        <li>Select a playlist in rekordbox</li>
        <li>File &gt; Export a Playlist to a File</li>
        <li>Drop the .txt here</li>
      </ol>
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

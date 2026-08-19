import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Card fonts, loaded from files bundled in the repo rather than fetched from
 * Google at request time. Only Anton and Space Mono — Google only distributes
 * Space Grotesk as a variable font, and Satori cannot parse one, so the card's
 * prose line falls back to Space Mono rather than carrying a font Satori can't
 * actually read. `next/og`'s ImageResponse needs actual font bytes —
 * it cannot read `var(--font-anton)` the way a browser can, so the card and
 * the site cannot literally share a font reference; this is what keeps them
 * matching in spite of that. Google's CSS endpoint also serves woff/woff2
 * depending on the request, and Satori can only parse ttf/otf, so a live fetch
 * is one Google format change away from breaking silently — a file checked
 * into the repo is not.
 */
const DIR = path.join(process.cwd(), 'assets', 'fonts');

let cache: Record<string, Promise<ArrayBuffer>> = {};

function load(file: string): Promise<ArrayBuffer> {
  return (cache[file] ??= readFile(path.join(DIR, file)).then((buf) => {
    const arrayBuffer = new ArrayBuffer(buf.byteLength);
    new Uint8Array(arrayBuffer).set(buf);
    return arrayBuffer;
  }));
}

export const antonFont = () => load('Anton-Regular.ttf');
export const spaceMonoFont = () => load('SpaceMono-Regular.ttf');

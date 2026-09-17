import type { BookletDesign } from '../../lib/yearbook-design';
export function mountBookletEditor(root: HTMLElement, options: {
  design: BookletDesign | null; sourcePage: number; revision: string; assetUrls: Record<string, string>;
  onDirty?: (dirty: boolean) => void;
  save: (design: BookletDesign, revision: string) => Promise<{ok: true; revision: string} | {ok: false; error: string}>;
  upload: (file: File) => Promise<{ok: true; path: string; url: string} | {ok: false; error: string}>;
}): () => void;

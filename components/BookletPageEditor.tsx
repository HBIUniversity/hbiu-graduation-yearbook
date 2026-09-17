'use client';

import { useEffect, useRef } from 'react';
import type { BookletDesign } from '../lib/yearbook-design';
import { mountBookletEditor } from '../public/yearbook/editor.mjs';
import { saveBookletDesign, uploadBookletImage } from '../app/admin/design-actions';
import '../public/yearbook/editor.css';

type Props = { bookId: string; pageId: string; revision: string; sourcePage: number; design: BookletDesign | null; assetUrls: Record<string, string> };
export default function BookletPageEditor(props: Props) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current) return;
    let dirty = false;
    const navigation = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.('a[href]');
      if (!dirty || !link || link.getAttribute('target') === '_blank') return;
      if (!window.confirm('This page has unsaved changes. Leave without saving?')) { event.preventDefault(); event.stopPropagation(); }
    };
    document.addEventListener('click', navigation, true);
    const dispose = mountBookletEditor(root.current, {
      design: props.design, sourcePage: props.sourcePage, revision: props.revision, assetUrls: props.assetUrls,
      onDirty: value => { dirty = value; },
      save: (design, revision) => saveBookletDesign(props.bookId, props.pageId, revision, design),
      upload: file => { const form = new FormData(); form.set('book_id', props.bookId); form.set('page_id', props.pageId); form.set('image', file); return uploadBookletImage(form); },
    });
    return () => { document.removeEventListener('click', navigation, true); dispose(); };
  }, [props.bookId, props.pageId, props.revision, props.design, props.assetUrls, props.sourcePage]);
  return <div ref={root} aria-label="Booklet page editor"><p>Opening the selected booklet page…</p></div>;
}

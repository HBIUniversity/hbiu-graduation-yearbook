/** Native, individually editable page objects. A raster preview is NOT a layer import. */
export type ElementKind = 'text' | 'image' | 'shape';
export type BookletElement = {
  id: string; kind: ElementKind; x: number; y: number; width: number; height: number;
  rotation: number; opacity: number; text?: string; fontSize?: number; fontFamily?: string;
  color?: string; bold?: boolean; italic?: boolean; align?: 'left' | 'center' | 'right';
  lineHeight?: number; assetPath?: string; fit?: 'cover' | 'contain'; fill?: string;
};
export type BookletDesign = {
  version: 1; width: number; height: number;
  source: { designId: string; pageNumber: number; conversion: 'layered' };
  background: { color: string; assetPath?: string; fit: 'cover' | 'contain' };
  elements: BookletElement[];
};
export const FONT_FAMILIES = ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS', 'Courier New'] as const;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function requireBookletId(value: unknown): string {
  if (typeof value !== 'string' || !uuid.test(value)) throw new Error('Invalid booklet or page identifier.');
  return value;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid page object.');
  return value as Record<string, unknown>;
}
function number(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${label}.`);
  return value;
}
function text(value: unknown, max: number, label: string): string {
  if (typeof value !== 'string' || value.length > max) throw new Error(`Invalid ${label}.`);
  return value;
}
function color(value: unknown): string {
  if (typeof value !== 'string' || !/^#[a-f0-9]{6}$/i.test(value)) throw new Error('Invalid color.');
  return value;
}
function fit(value: unknown): 'cover' | 'contain' {
  if (value !== 'cover' && value !== 'contain') throw new Error('Invalid image fit.');
  return value;
}
export function requireAssetPath(value: unknown, bookId: string): string {
  requireBookletId(bookId);
  const path = text(value, 240, 'asset path');
  if (!path.startsWith(`pages/${bookId}/`) || !/^pages\/[a-f0-9-]+\/[a-f0-9-]+\.(png|jpg|webp)$/i.test(path)) {
    throw new Error('Image must belong to this booklet.');
  }
  return path;
}
export function validateBookletDesign(input: unknown, bookId: string): BookletDesign {
  requireBookletId(bookId);
  const data = record(input);
  if (JSON.stringify(input).length > 600000) throw new Error('The page is too large to save.');
  if (data.version !== 1) throw new Error('Unsupported page format.');
  const width = number(data.width, 100, 4000, 'page width');
  const height = number(data.height, 100, 4000, 'page height');
  const source = record(data.source);
  if (source.conversion !== 'layered') throw new Error('This page has not been converted to editable objects.');
  const designId = text(source.designId, 80, 'source design');
  if (!/^[A-Za-z0-9_-]+$/.test(designId)) throw new Error('Invalid source design.');
  const pageNumber = number(source.pageNumber, 1, 500, 'source page');
  if (!Number.isInteger(pageNumber)) throw new Error('Invalid source page.');
  const bg = record(data.background);
  const background: BookletDesign['background'] = { color: color(bg.color), fit: fit(bg.fit) };
  if (bg.assetPath) background.assetPath = requireAssetPath(bg.assetPath, bookId);
  if (!Array.isArray(data.elements) || data.elements.length > 500) throw new Error('Invalid number of page elements.');
  const ids = new Set<string>();
  const elements = data.elements.map((item): BookletElement => {
    const e = record(item);
    const id = text(e.id, 100, 'element ID');
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) throw new Error('Duplicate or invalid element ID.');
    ids.add(id);
    if (!['text', 'image', 'shape'].includes(String(e.kind))) throw new Error('Unsupported element.');
    const out: BookletElement = {
      id, kind: e.kind as ElementKind, x: number(e.x, -width, width * 2, 'horizontal position'),
      y: number(e.y, -height, height * 2, 'vertical position'),
      width: number(e.width, 1, width * 3, 'element width'), height: number(e.height, 1, height * 3, 'element height'),
      rotation: number(e.rotation, -360, 360, 'rotation'), opacity: number(e.opacity, 0, 1, 'opacity'),
    };
    if (out.kind === 'text') {
      out.text = text(e.text, 50000, 'text'); out.fontSize = number(e.fontSize, 4, 500, 'font size');
      if (!FONT_FAMILIES.includes(e.fontFamily as typeof FONT_FAMILIES[number])) throw new Error('Unsupported font.');
      out.fontFamily = String(e.fontFamily); out.color = color(e.color); out.bold = e.bold === true; out.italic = e.italic === true;
      if (!['left', 'center', 'right'].includes(String(e.align))) throw new Error('Invalid alignment.');
      out.align = e.align as 'left' | 'center' | 'right'; out.lineHeight = number(e.lineHeight, 0.7, 3, 'line height');
    } else if (out.kind === 'image') {
      out.assetPath = requireAssetPath(e.assetPath, bookId); out.fit = fit(e.fit);
    } else out.fill = color(e.fill);
    return out;
  });
  return { version: 1, width, height, source: { designId, pageNumber, conversion: 'layered' }, background, elements };
}
export function designAssetPaths(design: BookletDesign): string[] {
  return [...new Set([design.background.assetPath, ...design.elements.map(e => e.assetPath)].filter((v): v is string => Boolean(v)))];
}
export function sameSource(a: BookletDesign, b: BookletDesign): boolean {
  return a.source.designId === b.source.designId && a.source.pageNumber === b.source.pageNumber && a.width === b.width && a.height === b.height;
}

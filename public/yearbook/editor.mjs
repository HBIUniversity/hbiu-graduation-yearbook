/* DOM-based object editor. No eval, raw HTML insertion, credential storage, or external scripts. */
const newId = () => { const bytes = crypto.getRandomValues(new Uint8Array(16)); return 'element-' + [...bytes].map(b => b.toString(16).padStart(2, '0')).join(''); };
const copy = value => JSON.parse(JSON.stringify(value));
function node(tag, className, label) {
  const el = document.createElement(tag); if (className) el.className = className;
  if (label !== undefined) el.textContent = label; return el;
}
export function mountBookletEditor(root, options) {
  root.replaceChildren(); root.classList.add('booklet-object-editor');
  const controller = new AbortController();
  const listen = (el, event, fn) => el.addEventListener(event, fn, { signal: controller.signal });
  let design = options.design ? copy(options.design) : null;
  let revision = options.revision, selected = null, dirty = false, busy = false;
  let undo = [], redo = [], urls = { ...(options.assetUrls || {}) };
  const status = node('p', 'boe-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  root.append(status);
  if (!design || design.source?.conversion !== 'layered') {
    const image = node('div', 'boe-original'); image.setAttribute('role', 'img'); image.setAttribute('aria-label', 'Original booklet page, awaiting editable object conversion');
    const page = Math.max(1, Math.min(35, Number(options.sourcePage) || 1)), i = page - 1;
    Object.assign(image.style, { backgroundImage: "url('/yearbook/master-2026-atlas.jpg')", backgroundSize: '500% 700%', backgroundPosition: `${(i % 5) * 25}% ${Math.floor(i / 5) * 100 / 6}%` });
    status.textContent = 'Original page preserved. Its individual text, photographs, and background have not been imported as editable objects yet. This is not a blank page.';
    root.append(image); return () => { controller.abort(); root.replaceChildren(); };
  }
  const bar = node('div', 'boe-tools'), workspace = node('div', 'boe-workspace'), frame = node('div', 'boe-frame'), sheet = node('div', 'boe-sheet'), inspector = node('div', 'boe-inspector');
  sheet.setAttribute('aria-label', 'Editable booklet page'); sheet.tabIndex = 0;
  Object.assign(sheet.style, { width: `${design.width}px`, height: `${design.height}px` });
  frame.append(sheet); workspace.append(frame, inspector); root.append(bar, workspace);
  function button(label, fn, parent = bar) { const b = node('button', '', label); b.type = 'button'; listen(b, 'click', fn); parent.append(b); return b; }
  const undoButton = button('Undo', () => travel('undo')), redoButton = button('Redo', () => travel('redo'));
  const saveButton = button('Save page', save);
  button('Background', () => { selected = null; render(); });
  button('Add text', () => change(() => { const e = { id: newId(), kind: 'text', x: 60, y: 60, width: 400, height: 100, rotation: 0, opacity: 1, text: 'New text', fontSize: 28, fontFamily: 'Arial', color: '#10233d', bold: false, italic: false, align: 'left', lineHeight: 1.2 }; design.elements.push(e); selected = e.id; }));
  button('Add image', () => chooseImage('new'));
  const deleteButton = button('Remove selected', () => { if (selected) change(() => { design.elements = design.elements.filter(e => e.id !== selected); selected = null; }); });
  function markDirty(value) { dirty = value; saveButton.disabled = busy || !dirty; undoButton.disabled = busy || undo.length === 0; redoButton.disabled = busy || redo.length === 0; options.onDirty?.(dirty); status.textContent = dirty ? 'Unsaved page changes' : 'Page loaded'; }
  function remember() { undo.push(copy(design)); if (undo.length > 50) undo.shift(); redo = []; }
  function change(fn) { if (busy) return; remember(); fn(); markDirty(true); render(); }
  function travel(direction) { if (busy) return; const from = direction === 'undo' ? undo : redo, to = direction === 'undo' ? redo : undo; if (!from.length) return; to.push(copy(design)); design = from.pop(); markDirty(true); render(); }
  function patch(field, value) { const e = design.elements.find(e => e.id === selected); if (e) change(() => { e[field] = value; }); }
  function scale() { return Math.min(1, Math.max(0.1, frame.clientWidth / design.width)); }
  function resize() { const s = scale(); sheet.style.transform = `scale(${s})`; frame.style.height = `${design.height * s}px`; }
  const observer = new ResizeObserver(resize); observer.observe(frame);
  function textStyle(e) { return { fontFamily: e.fontFamily, fontSize: `${e.fontSize}px`, lineHeight: String(e.lineHeight), fontWeight: e.bold ? '700' : '400', fontStyle: e.italic ? 'italic' : 'normal', color: e.color, textAlign: e.align }; }
  function beginTextEdit(wrapper, e) {
    if (busy || wrapper.querySelector('textarea')) return;
    remember(); const input = node('textarea', 'boe-text-input'); input.value = e.text;
    Object.assign(input.style, textStyle(e)); input.setAttribute('aria-label', 'Edit selected text');
    wrapper.replaceChildren(input); listen(input, 'input', () => { e.text = input.value; markDirty(true); });
    listen(input, 'blur', render); input.focus();
  }
  function beginDrag(event, e, mode) {
    if (busy) return; event.preventDefault(); event.stopPropagation(); remember();
    const start = { x: event.clientX, y: event.clientY, ex: e.x, ey: e.y, w: e.width, h: e.height }, s = scale();
    const handle = event.currentTarget, wrapper = handle.parentElement; handle.setPointerCapture(event.pointerId);
    const move = p => { const dx = (p.clientX - start.x) / s, dy = (p.clientY - start.y) / s;
      if (mode === 'move') { e.x = Math.min(design.width * 2, Math.max(-design.width, start.ex + dx)); e.y = Math.min(design.height * 2, Math.max(-design.height, start.ey + dy)); }
      else { e.width = Math.min(design.width * 3, Math.max(10, start.w + dx)); e.height = Math.min(design.height * 3, Math.max(10, start.h + dy)); }
      Object.assign(wrapper.style, { left: `${e.x}px`, top: `${e.y}px`, width: `${e.width}px`, height: `${e.height}px` }); markDirty(true);
    };
    const end = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', end); handle.removeEventListener('pointercancel', end); render(); };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
  }
  function field(label, value, callback, type = 'text') {
    const labelNode = node('label', '', label), input = node('input'); input.type = type; input.value = String(value); if (type === 'number') input.step = 'any';
    listen(input, 'change', () => { if (type === 'number' && !Number.isFinite(input.valueAsNumber)) { input.value = String(value); return; } callback(type === 'number' ? input.valueAsNumber : input.value); }); labelNode.append(input); inspector.append(labelNode);
  }
  function selectField(label, value, items, callback) {
    const l = node('label', '', label), input = node('select'); for (const item of items) { const o = node('option', '', item); o.value = item; input.append(o); } input.value = value;
    listen(input, 'change', () => callback(input.value)); l.append(input); inspector.append(l);
  }
  async function chooseImage(target) {
    if (busy) return; const input = node('input'); input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp';
    listen(input, 'change', async () => { const file = input.files?.[0]; if (!file) return; busy = true; render(); status.textContent = 'Uploading image…';
      try { const result = await options.upload(file); if (!result?.ok) throw new Error(result?.error || 'Image upload failed.');
        busy = false; urls[result.path] = result.url;
        change(() => { if (target === 'background') design.background.assetPath = result.path;
          else if (target === 'new') { const e = { id: newId(), kind: 'image', x: 60, y: 60, width: 250, height: 250, rotation: 0, opacity: 1, assetPath: result.path, fit: 'cover' }; design.elements.push(e); selected = e.id; }
          else { const e = design.elements.find(e => e.id === target); if (e?.kind === 'image') e.assetPath = result.path; }
        });
      } catch (error) { busy = false; render(); status.textContent = error.message || 'Image was not uploaded. Your page is unchanged.'; }
    }); input.click();
  }
  async function save() {
    if (busy || !dirty) return; busy = true; render(); status.textContent = 'Saving page…';
    try { const result = await options.save(copy(design), revision); if (!result?.ok) throw new Error(result?.error || 'Page was not saved.');
      revision = result.revision; markDirty(false); status.textContent = 'Page saved. Publishing is separate.';
    } catch (error) { status.textContent = error.message || 'Save failed. Your unsaved changes are still here.'; }
    finally { busy = false; render(); }
  }
  function render() {
    sheet.replaceChildren(); inspector.replaceChildren();
    sheet.style.backgroundColor = design.background.color; const bgUrl = urls[design.background.assetPath];
    sheet.style.backgroundImage = bgUrl ? `url(${JSON.stringify(bgUrl)})` : 'none'; sheet.style.backgroundSize = design.background.fit; sheet.style.backgroundPosition = 'center';
    for (const control of bar.querySelectorAll('button')) control.disabled = busy;
    undoButton.disabled = busy || undo.length === 0; redoButton.disabled = busy || redo.length === 0; saveButton.disabled = busy || !dirty; deleteButton.disabled = busy || !selected;
    for (const e of design.elements) {
      const wrapper = node('div', `boe-element${selected === e.id ? ' boe-selected' : ''}`); wrapper.dataset.elementId = e.id; wrapper.tabIndex = 0;
      wrapper.setAttribute('aria-label', e.kind === 'text' ? `Text: ${e.text.slice(0, 80)}` : `${e.kind} element`);
      Object.assign(wrapper.style, { left: `${e.x}px`, top: `${e.y}px`, width: `${e.width}px`, height: `${e.height}px`, transform: `rotate(${e.rotation}deg)`, opacity: String(e.opacity) });
      if (e.kind === 'text') { const content = node('div', 'boe-text', e.text); Object.assign(content.style, textStyle(e)); wrapper.append(content); }
      else if (e.kind === 'image') { const img = node('img', 'boe-image'); img.alt = 'Booklet image'; img.draggable = false; if (urls[e.assetPath]) img.src = urls[e.assetPath]; img.style.objectFit = e.fit; wrapper.append(img); }
      else wrapper.style.backgroundColor = e.fill;
      listen(wrapper, 'click', event => { if (busy || event.target.closest('textarea,button')) return; event.stopPropagation(); selected = e.id; render(); const active = [...sheet.children].find(n => n.dataset.elementId === e.id); if (e.kind === 'text') beginTextEdit(active, e); else if (e.kind === 'image') chooseImage(e.id); });
      listen(wrapper, 'keydown', event => { if (event.target.tagName === 'TEXTAREA') return; if (event.key === 'Enter') { event.preventDefault(); wrapper.click(); } });
      if (selected === e.id) { const mover = button('Move', () => {}, wrapper); mover.className = 'boe-move'; listen(mover, 'pointerdown', event => beginDrag(event, e, 'move'));
        const resizer = button('↘', () => {}, wrapper); resizer.className = 'boe-resize'; resizer.setAttribute('aria-label', 'Resize selected element'); listen(resizer, 'pointerdown', event => beginDrag(event, e, 'resize')); }
      sheet.append(wrapper);
    }
    const e = design.elements.find(e => e.id === selected); if (!e) {
      inspector.append(node('h3', '', 'Page background'));
      field('Background color', design.background.color, value => change(() => { design.background.color = value; }), 'color');
      button('Replace background image', () => chooseImage('background'), inspector);
      if (design.background.assetPath) button('Remove background image', () => change(() => { delete design.background.assetPath; }), inspector);
    } else {
      inspector.append(node('h3', '', `Selected ${e.kind}`));
      if (e.kind === 'text') {
        const label = node('label', '', 'Text'), input = node('textarea'); input.value = e.text; listen(input, 'change', () => patch('text', input.value)); label.append(input); inspector.append(label);
        field('Font size', e.fontSize, value => patch('fontSize', Math.max(4, Math.min(500, value))), 'number');
        field('Text color', e.color, value => patch('color', value), 'color');
        selectField('Font', e.fontFamily, ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS', 'Courier New'], value => patch('fontFamily', value));
        selectField('Alignment', e.align, ['left', 'center', 'right'], value => patch('align', value));
        button(e.bold ? 'Regular weight' : 'Bold', () => patch('bold', !e.bold), inspector);
      } else if (e.kind === 'image') { button('Replace image', () => chooseImage(e.id), inspector); selectField('Image fit', e.fit, ['cover', 'contain'], value => patch('fit', value)); }
      else field('Shape color', e.fill, value => patch('fill', value), 'color');
      for (const [key, label] of [['x', 'Left'], ['y', 'Top'], ['width', 'Width'], ['height', 'Height'], ['rotation', 'Rotation']]) field(label, e[key], value => patch(key, value), 'number');
      button('Bring forward', () => change(() => { const index = design.elements.indexOf(e); if (index < design.elements.length - 1) [design.elements[index], design.elements[index + 1]] = [design.elements[index + 1], e]; }), inspector);
      button('Send backward', () => change(() => { const index = design.elements.indexOf(e); if (index > 0) [design.elements[index], design.elements[index - 1]] = [design.elements[index - 1], e]; }), inspector);
    }
    for (const control of bar.querySelectorAll('button')) if (busy) control.disabled = true;
    for (const control of inspector.querySelectorAll('input,select,textarea,button')) control.disabled = busy;
    resize();
  }
  listen(sheet, 'click', event => { if (event.target === sheet) { selected = null; render(); } });
  listen(window, 'beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  listen(root, 'keydown', event => { if (!(event.ctrlKey || event.metaKey)) return; if (event.key.toLowerCase() === 's') { event.preventDefault(); document.activeElement?.blur(); save(); } else if (event.key.toLowerCase() === 'z' && !['TEXTAREA', 'INPUT'].includes(event.target.tagName)) { event.preventDefault(); travel(event.shiftKey ? 'redo' : 'undo'); } });
  render(); markDirty(false);
  return () => { observer.disconnect(); controller.abort(); root.replaceChildren(); };
}

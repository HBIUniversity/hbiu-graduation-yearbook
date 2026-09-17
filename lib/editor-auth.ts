import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE = 'hbiu_yearbook_editor';

export async function isEditor() {
  const secret = process.env.YEARBOOK_ADMIN_KEY;
  if (!secret) return false;
  const jar = await cookies();
  return jar.get(COOKIE)?.value === secret;
}

export async function requireEditor() {
  if (!(await isEditor())) redirect('/admin/login');
}

export async function setEditorSession() {
  const secret = process.env.YEARBOOK_ADMIN_KEY;
  if (!secret) throw new Error('YEARBOOK_ADMIN_KEY is not configured.');
  const jar = await cookies();
  jar.set(COOKIE, secret, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 12 });
}

export async function clearEditorSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

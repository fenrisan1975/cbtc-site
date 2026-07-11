// Guards everything under /admin (pages) and /api/admin (form actions),
// except the login page/endpoint themselves. See src/lib/adminAuth.js for
// how the session cookie works.
import { defineMiddleware } from 'astro:middleware';
import { isAuthed } from './lib/adminAuth.js';

export const onRequest = defineMiddleware((context, next) => {
  const { pathname } = context.url;

  const isLoginPage = pathname === '/admin/login';
  const isLoginApi = pathname === '/api/admin/login';
  const guardedPage = pathname.startsWith('/admin') && !isLoginPage;
  const guardedApi = pathname.startsWith('/api/admin') && !isLoginApi;

  if ((guardedPage || guardedApi) && !isAuthed(context.cookies)) {
    if (guardedApi) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/admin/login');
  }

  return next();
});

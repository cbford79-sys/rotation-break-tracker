// Rotation Break Tracker service worker
// Applies the plant rotation rollover rule: 9999 -> 6000.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.mode !== 'navigate') return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request, { cache: 'no-store' });
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !type.includes('text/html')) return response;

      let html = await response.text();
      const oldFn = `function rotationDiff(start,end){\n  return (parseInt(end,10)-parseInt(start,10)+10000)%10000;\n}`;
      const newFn = `function rotationDiff(start,end){\n  const s=parseInt(start,10);\n  const e=parseInt(end,10);\n\n  // Plant sequence rolls from 9999 directly to 6000.\n  if(s>=6000 && e>=6000){\n    return (e-s+4000)%4000;\n  }\n\n  // Preserve normal counting for any legacy values below 6000.\n  return (e-s+10000)%10000;\n}`;

      html = html.replace(oldFn, newFn);

      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.set('cache-control', 'no-store');
      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      return fetch(request);
    }
  })());
});

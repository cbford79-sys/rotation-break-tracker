// Rotation Break Tracker service worker v6
// Always prefer the newest deployed app shell so installed PWAs receive updates.
const VERSION='rotation-break-tracker-v6';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method!=='GET') return;

  // Navigation is network-first and explicitly bypasses browser HTTP cache.
  if(request.mode==='navigate'){
    event.respondWith(fetch(new Request(request,{cache:'reload'})).catch(()=>fetch(request)));
    return;
  }
});

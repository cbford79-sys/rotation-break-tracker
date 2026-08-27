// Rotation Break Tracker service worker v7
// Network-first app shell plus v7 enhancement loader.
const VERSION='rotation-break-tracker-v7';

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

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(new Request(request,{cache:'reload'}));
        const type=response.headers.get('content-type')||'';
        if(!type.includes('text/html')) return response;
        let html=await response.text();
        if(!html.includes('enhancements.js')) html=html.replace('</body>','<script src="./enhancements.js?v=7"></script></body>');
        const headers=new Headers(response.headers);
        headers.set('content-type','text/html; charset=utf-8');
        headers.set('cache-control','no-store');
        headers.delete('content-length');
        return new Response(html,{status:response.status,statusText:response.statusText,headers});
      }catch(err){
        return fetch(request);
      }
    })());
  }
});

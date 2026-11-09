/* Тренажёр ПДД C·D — работа без интернета.
   Оболочка (страница, шрифты, иконки) лежит в кэше версии SHELL; при обновлении приложения меняйте номер.
   Картинки (p0–p7.json и ab/p0–p7.json) лежат в отдельном кэше IMG и не перекачиваются при обновлении. */
const SHELL='pdd-cd-shell-2', IMG='pdd-cd-img-1';
const FILES=['./','index.html','ab/','ab/index.html','manifest.webmanifest',
 'icons/icon-180.png','icons/icon-192.png','icons/icon-512.png',
 'fonts/pt-sans-cyrillic-400-normal.woff2','fonts/pt-sans-latin-400-normal.woff2',
 'fonts/pt-sans-cyrillic-700-normal.woff2','fonts/pt-sans-latin-700-normal.woff2',
 'fonts/pt-sans-narrow-cyrillic-700-normal.woff2','fonts/pt-sans-narrow-latin-700-normal.woff2',
 'fonts/pt-mono-cyrillic-400-normal.woff2','fonts/pt-mono-latin-400-normal.woff2'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(SHELL).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==SHELL&&k!==IMG).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;

  // Страница: сразу из кэша, свежую версию подтягиваем в фоне для следующего запуска.
  if(req.mode==='navigate'){
    // У каждой категории своя страница: /pdd-cd/ — C·D, /pdd-cd/ab/ — A·B.
    const key=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
    e.respondWith(caches.match(key).then(cached=>{
      const net=fetch(req).then(res=>{
        if(res.ok){const copy=res.clone();caches.open(SHELL).then(c=>c.put(key,copy))}
        return res;
      }).catch(()=>cached);
      if(cached){try{e.waitUntil(net.catch(()=>{}))}catch(_){}return cached}
      return net;
    }));
    return;
  }

  // Остальное: кэш, потом сеть. Скачанные пакеты картинок сохраняем.
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(cached=>cached||fetch(req).then(res=>{
    if(res.ok&&/\/p\d+\.json$/.test(url.pathname)){const copy=res.clone();caches.open(IMG).then(c=>c.put(req,copy))}
    return res;
  })));
});

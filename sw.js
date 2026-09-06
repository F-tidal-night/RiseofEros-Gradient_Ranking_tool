// 欲神幻想梯度榜 Service Worker：把官方角色图缓存到浏览器内，不进相册、不占下载目录
const CACHE_NAME = 'yshx-tool-v1';

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(key) {
                    return key !== CACHE_NAME;
                }).map(function(key) {
                    return caches.delete(key);
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function(event) {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // 图片（角色图/装饰图）：缓存优先，离线也能显示
    if (/\/images\/.+\.(png|jpe?g|webp|gif)$/i.test(url.pathname)) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async function(cache) {
                const cached = await cache.match(request);
                if (cached) return cached;
                try {
                    const response = await fetch(request);
                    if (response && response.ok) {
                        cache.put(request, response.clone());
                    }
                    return response;
                } catch (error) {
                    return cached;
                }
            })
        );
        return;
    }

    // 页面/JSON：优先网络，失败时用缓存兜底
    if (url.pathname.endsWith('.html') || url.pathname.endsWith('.json') || url.pathname.endsWith('.js')) {
        event.respondWith(
            fetch(request).then(function(response) {
                if (response && response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(request, copy);
                    });
                }
                return response;
            }).catch(function() {
                return caches.match(request);
            })
        );
    }
});

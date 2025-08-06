/**
 * Service Worker - Video Cache
 * 動画ファイルのキャッシュ戦略
 */

const CACHE_NAME = 'interconnect-video-v1';
const VIDEO_CACHE_NAME = 'interconnect-video-cache-v1';

// URL検証関数
function isValidUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

// キャッシュする動画ファイル
const VIDEO_URLS = [
    '/assets/interconnect-top.mp4'
];

// インストール時に動画をプリキャッシュ
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(VIDEO_CACHE_NAME)
            .then(cache => {
                return cache.addAll(VIDEO_URLS);
            })
            .then(() => self.skipWaiting())
    );
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== VIDEO_CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// フェッチイベントの処理
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // 動画ファイルの場合
    if (request.url.includes('.mp4') || request.url.includes('.webm')) {
        event.respondWith(
            caches.open(VIDEO_CACHE_NAME).then(cache => {
                return cache.match(request).then(cachedResponse => {
                    if (cachedResponse) {
                        // ビデオキャッシュヒットのログを削除
                        return cachedResponse;
                    }
                    
                    // キャッシュにない場合はネットワークから取得
                    return fetch(request).then(networkResponse => {
                        // レスポンスが正常で、かつ有効なURLの場合のみキャッシュ
                        if (networkResponse && networkResponse.status === 200 && isValidUrl(request.url)) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }
    
    // その他のリソースは通常のキャッシュ戦略
    if (request.url.includes('/assets/') || request.url.includes('.css') || request.url.includes('.js')) {
        event.respondWith(
            caches.match(request).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return fetch(request).then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200) {
                        return networkResponse;
                    }
                    
                    // URL検証: chrome-extension スキームはキャッシュしない
                    if (!isValidUrl(request.url)) {
                        // ログ出力を削除してスパムを防ぐ
                        return networkResponse;
                    }
                    
                    const responseToCache = networkResponse.clone();
                    
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseToCache);
                    });
                    
                    return networkResponse;
                });
            })
        );
    }
});

// バックグラウンドフェッチ（実験的機能）
self.addEventListener('backgroundfetch', (event) => {
    event.waitUntil(
        (async () => {
            const registration = event.registration;
            
            if (registration.id === 'video-preload') {
                const records = await registration.matchAll();
                
                const cache = await caches.open(VIDEO_CACHE_NAME);
                
                for (const record of records) {
                    const response = await record.responseReady;
                    await cache.put(record.request, response);
                }
            }
        })()
    );
});
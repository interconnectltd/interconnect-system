/**
 * Service Worker - Video Cache (Fixed)
 * chrome-extension スキームのエラーを修正
 */

const CACHE_NAME = 'interconnect-video-v1';
const VIDEO_CACHE_NAME = 'interconnect-video-cache-v1';

// キャッシュする動画ファイル
const VIDEO_URLS = [
    '/assets/interconnect-top.mp4'
];

// URLが有効かチェック
function isValidUrl(url) {
    try {
        const urlObj = new URL(url);
        // chrome-extension:// や他の無効なスキームを除外
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

// インストール時に動画をプリキャッシュ（一時的に無効化）
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker');
    
    // 動画のプリキャッシュを無効化（パフォーマンス改善のため）
    event.waitUntil(
        Promise.resolve()
            .then(() => {
                console.log('[SW] Skipping video pre-cache for performance');
                return self.skipWaiting();
            })
    );
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== VIDEO_CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
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
    
    // chrome-extension:// などの無効なURLをスキップ
    if (!isValidUrl(request.url)) {
        return;
    }
    
    const url = new URL(request.url);
    
    // 動画ファイルの場合
    if (request.url.includes('.mp4') || request.url.includes('.webm')) {
        event.respondWith(
            caches.open(VIDEO_CACHE_NAME).then(cache => {
                return cache.match(request).then(cachedResponse => {
                    if (cachedResponse) {
                        console.log('[SW] Serving video from cache:', request.url);
                        return cachedResponse;
                    }
                    
                    // キャッシュにない場合はネットワークから取得
                    return fetch(request).then(networkResponse => {
                        // レスポンスが正常な場合のみキャッシュ
                        if (networkResponse && networkResponse.status === 200) {
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
                    // 無効なURLはキャッシュしない
                    if (!networkResponse || networkResponse.status !== 200 || !isValidUrl(request.url)) {
                        return networkResponse;
                    }
                    
                    const responseToCache = networkResponse.clone();
                    
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseToCache);
                    }).catch(error => {
                        console.log('[SW] Cache put error:', error);
                    });
                    
                    return networkResponse;
                });
            })
        );
    }
});
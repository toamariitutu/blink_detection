var CACHE_NAME = 'my-site-cache-v1';
var urlsToCache = [
  './',
  './common/css/common.css',
  './common/css/normalize.css',
  './common/js/clmtrackr.min.js',
  './common/js/stats.min.js',
  './common/js/model/model_pca_20_svm.js',
];

self.addEventListener('install', function(event) {
  // インストール処理
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // キャッシュがあったのでそのレスポンスを返す
        if (response) {
          console.log('Cache exist!', response)
          return response;
        }

        console.log('Not exist!')

        // 重要：リクエストを clone する。リクエストは Stream なので
        // 一度しか処理できない。ここではキャッシュ用、fetch 用と2回
        // 必要なので、リクエストは clone しないといけない
        var fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          function(response) {
            // レスポンスが正しいかをチェック
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 重要：レスポンスを clone する。レスポンスは Stream で
            // ブラウザ用とキャッシュ用の2回必要。なので clone して
            // 2つの Stream があるようにする
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
                console.log('Cashe added!', responseToCache)
              });

            return response;
          }
        );
      })
    );
});

self.addEventListener('activate', function(event) {

  var cacheWhitelist = ['pages-cache-v1', 'blog-posts-cache-v1'];

  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('古いキャッシュを削除', cacheName)
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

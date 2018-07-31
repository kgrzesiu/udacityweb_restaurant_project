importScripts('/js/indexdbhelper.js');
importScripts('/js/libs/idb.js');

var staticCacheName = 'site-static-18';
var contentImgsCache = 'site-imgs-2';
var allCaches = [
  staticCacheName,
  contentImgsCache
];

self.addEventListener('install', function(event){

    var urlsToCache = [
        // '/',
        // '/restaurant.html',
        // '/js/dbhelper.js',
        // '/js/main.js',
        // '/js/restaurant_info.js',
        // '/js/token.js',
        // '/img',
        // '/css/mystyles.css',
        // '/css/restaurantdetailsto800.css',
        // '/css/size500to800.css',
        // '/css/sizefrom800.css',
        // '/css/sizeto500.css',
        // '/css/styles.css',
    ];

    event.waitUntil(
        caches.open(staticCacheName).then(function(cache){
            return cache.addAll(urlsToCache);
        })
    );
})

self.addEventListener('activate', function(event){
    event.waitUntil(
        caches.keys().then(function(cacheNames){
            return Promise.all(
                cacheNames.filter(function(cacheName){
                    return cacheName.startsWith('site-static-') && 
                        cacheName != staticCacheName;
                }).map(function(cacheName){
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', function(event){
    var requestUrl = new URL(event.request.url);

    //console.log(requestUrl.pathname,'Fetch '+ event.request.url);

    if (requestUrl.pathname.startsWith('/img/')) {
        event.respondWith(servePhoto(event.request));
        return;
    }

    //write json to db
    if (requestUrl.pathname == '/restaurants') {
        return fetch(event.request.url).then(function(res){
            let rclone = res.clone();
            rclone.json().then(function(res){
                //json
                console.log('4 Inside worker: ',res);
                //works
                
            });
            return res;
        })
    }

    // event.respondWith(
    //     caches.match(event.request).then(function(response){
    //         if (response) return response;
    //         return fetch(event.request).catch(function(){
    //             console.log('catched fetch error');
    //         });
    //     })
    // );

    event.respondWith(
        caches.open(staticCacheName).then(function(cache) {
          return cache.match(event.request).then(function (response) {
            return response || fetch(event.request).then(function(response) {
              cache.put(event.request, response.clone());
              return response;
            });
          });
        })
    );
})

function servePhoto(request) {
    // Photo urls look like:
    // /photos/9-8028-7527734776-e1d2bda28e-800px.jpg
    // But storageUrl has the -800px.jpg bit missing.
    // Use this url to store & match the image in the cache.
    // This means you only store one copy of each photo.
    var storageUrl = request.url.replace(/-\d+px\.jpg$/, '');
  
    //console.log(storageUrl);
    return caches.open(contentImgsCache).then(function(cache){
        return cache.match(storageUrl).then(function(response){
            if (response) return response;

            return fetch(request).then(function(networkResponse){
                cache.put(storageUrl, networkResponse.clone());

                return networkResponse;
            }).catch(function(){
                console.log('Caught fetch request image cache for '+request.url);
            })
        })
    })
  }
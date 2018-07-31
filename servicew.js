importScripts('/js/indexdbhelper.js');
importScripts('/js/libs/idb.js');

var staticCacheName = 'site-static-20';
var contentImgsCache = 'site-imgs-3';
var allCaches = [
  staticCacheName,
  contentImgsCache
];

self.addEventListener('install', function(event){

    var urlsToCache = [
        '/',
        '/restaurant.html',
        '/js/dbhelper.js',
        '/js/indexdbhelper.js',
        '/js/main.js',
        '/js/restaurant_info.js',
        '/js/token.js',
        '/js/libs/idb.js',
        '/img',
        '/css/mystyles.css',
        '/css/restaurantdetailsto800.css',
        '/css/size500to800.css',
        '/css/sizefrom800.css',
        '/css/sizeto500.css',
        '/css/styles.css',
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



function storeRestaurantsInDB(restaurants){
    let rclone = restaurants.clone();
    rclone.json().then(function(resJson){
        const db = IndexDBHelper.openDatabase();
        for (const restaurant of resJson){
            IndexDBHelper.saveRestaurantWithPromise(db, restaurant)
            .then(saveRes => {
                //console.log('Saved', saveRes);
            });
        }
    });
    return restaurants;
}

function returnRestaurantsFromDB(err){
    return IndexDBHelper.getAllRestaurants().then(res => {
        //got all restaurants return them from database
        return new Response(JSON.stringify(res), {
            headers: {'Content-Type': 'application/json'}
        });
    });
}

self.addEventListener('fetch', function(event){
    var requestUrl = new URL(event.request.url);

    //console.log(requestUrl.pathname,'Fetch '+ event.request.url);

    if (requestUrl.pathname.startsWith('/img/')) {
        event.respondWith(servePhoto(event.request));
        return;
    }

    //all restaurants
    //http://localhost:1337/restaurants
    if (requestUrl.pathname == '/restaurants') {
        event.respondWith(
            fetch(event.request.url)
            .then(storeRestaurantsInDB)
            .catch(returnRestaurantsFromDB)
        );
        return;
    }

    // var WORKER_VER = 36;
    // console.log(WORKER_VER + ' Version - store');

    //single restaurant
    //http://localhost:1337/restaurants/1
    if (requestUrl.pathname.startsWith('/restaurants/')) {
        var id = +requestUrl.pathname.split('/')[2];
        
        event.respondWith(
            fetch(event.request.url)
            .then(res => { 
                console.log('Fetching remote restaurant');
                return res;
            })
            .catch(err =>{
                console.log('Fetching rest from database with id',id);
                return IndexDBHelper.getRestaurantById(id).then(res => {
                    //got one restaurant from database
                    return new Response(JSON.stringify(res), {
                        headers: {'Content-Type': 'application/json'}
                    });
                });
            })
        );
        return;
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
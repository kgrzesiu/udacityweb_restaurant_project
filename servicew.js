
// Sometimes doesn't work?
self.importScripts('/js/libs/indexdbhelper.js');
self.importScripts('/js/libs/idb.js');

var WORKER_VER = 80;

var LOCAL_STORAGE_REF = "deferedReviewLocalStorage";

var staticCacheName = 'site-static-'+WORKER_VER;
var contentImgsCache = 'site-static-imgs-'+WORKER_VER;
var allCaches = [
  staticCacheName,
  contentImgsCache
];

self.addEventListener('install', function(event){
    
    console.log(' Install Version - store', WORKER_VER);

    var urlsToCache = [
        '/',
        '/restaurant.html',
        '/js/dbhelper.js',
        '/js/main.js',
        '/js/restaurant_info.js',
        '/js/token.js',
        '/css/mystyles.css',
        '/css/restaurantdetailsto900.css',
        '/css/size500to800.css',
        '/css/sizefrom800.css',
        '/css/sizeto500.css',
        '/css/styles.css'
    ];

    event.waitUntil(
        caches.open(staticCacheName).then(function(cache){
            return cache.addAll(urlsToCache);
        }).catch(function(err){
          console.log('Cache request failed',err);
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

self.addEventListener('message', event => { 
  console.log('Message from web page:',event);
  if (event.data.action === 'saveReview'){
    //THIS will not work, we don't have the id of the review yet
    //console.log("Saving review in database",event.data.data);
    //IndexDBHelper.saveReview(event.data.data);
  }
});

self.addEventListener('sync', function(event) {
  console.log('Online state regained, syncing: ',event.tag);
  if (event.tag == 'favoritesSync') {
    return IndexDBHelper.getAllFavorites().then(favs =>{
      return Promise.all(favs.map(function(fav){
        return fetch(fav.url, { method: "PUT"})
              .then(res => {
                //if success
                if (res.ok){
                  IndexDBHelper.deleteFavorite(fav);
                } 
              })
      }));
    });
  }
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

function storeReviewsInDB(reviews){
  let rclone = reviews.clone();
  rclone.json().then(function(resJson){
      const db = IndexDBHelper.openDatabase();
      for (const review of resJson){
          IndexDBHelper.saveReviewWithPromise(db, review)
          .then(saveRes => {
              //console.log('Saved', saveRes);
          });
      }
  });
  return reviews;
}

function storeReviewInDB(review){
  let rclone = review.clone();
  rclone.json().then(function(resJson){
      const db = IndexDBHelper.openDatabase();
      IndexDBHelper.saveReviewWithPromise(db, resJson)
      .then(saveRes => {
          //console.log('Saved', saveRes);
      });
  });
  return review;
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
    var req = event.request.clone();
    var requestUrl = new URL(req.url);

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

    //single restaurant
    //http://localhost:1337/restaurants/1
    if (requestUrl.pathname.startsWith('/restaurants/')) {
        var id = +requestUrl.pathname.split('/')[2];

        //if method is put just skip it
        //http://localhost:1337/restaurants/1/?is_favorite=false
        if (req.method =="PUT"){
          event.respondWith(
            fetch(event.request)
            .then(mainRes => {
              var state = requestUrl.searchParams.get('is_favorite');
              state = state === "true" ? true : false;
              //get the restaurant locally
              IndexDBHelper.getRestaurantById(id).then(res=>{
                  res['is_favorite'] = state;
                  IndexDBHelper.saveRestaurant(res).then( r => {
                })
              })
              return mainRes;
            })
            .catch(err =>{
              //failed to execute favorite request
              console.log('Failed to excecute request',requestUrl.href);
              return IndexDBHelper.saveFavorite(requestUrl.href)
              .then(saveRes => {
                    //we saved request in DB, respond
                    return new Response('Favorite stored for later save');
              });
            })
          );
          return;
        }

        //respond
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

    //reviews for restaurant by id
    //http://localhost:1337/reviews/?restaurant_id=1
    if (requestUrl.pathname.startsWith('/reviews')) {

      if (req.method =="POST"){
        //saving review
        event.respondWith(
          fetch(event.request)
          .then(storeReviewInDB)
          .catch(err => {
            console.log('Fetch create or save review in local database failed',err);
          })
        );
        return;
      }

      //this is get, so just get all the reviews
      id = +requestUrl.searchParams.get('restaurant_id');
      //console.log("GET reviews for restaurant",id,"Post",req.method,"Request fetch url",event.request.url);
      event.respondWith(
          fetch(event.request.url)
          .then(res => { 
              console.log('Fetching remote reviews');
              return res;
          })
          .then(storeReviewsInDB)
          .catch(err =>{
              console.log('Fetching reviews from database with id',id);
              return IndexDBHelper.getReviewsByRestaurantId(id).then(res => {
                  //got reviews from local
                  console.log('Got reviews from local',);
                  return new Response(JSON.stringify(res), {
                      headers: {'Content-Type': 'application/json'}
                  });
              })
              .catch(err => {
                console.log('Error getting the local reviews',err);
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
            }).catch(function(err){
              console.log('Fetch request failed',err, event.request.url);
            });
          });
        }).catch(function(err){
          console.log('Failed to open the chache',staticCacheName);
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
        return cache.match(storageUrl,{ignoreSearch:true}).then(function(response){
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
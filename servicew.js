/*============================================IDB.JS============================*/
'use strict';

(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        },
        set: function(val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      // Don't create iterateKeyCursor if openKeyCursor doesn't exist.
      if (!(funcName in Constructor.prototype)) return;

      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      if (request) {
        request.onupgradeneeded = function(event) {
          if (upgradeCallback) {
            upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
          }
        };
      }

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  }
  else {
    self.idb = exp;
  }
}());

/*==============================================================================*/

/*============================================indexdbhelper.js============================*/
console.log('Imporetd IndexDBHelper');

class IndexDBHelper { 
   /**
   * Open database, and returns the promise
   */
  static openDatabase() {
    return idb.open(IndexDBHelper.DB_NAME, 3, function(upgradeDb){
        console.log('Opening database');
        switch(upgradeDb.oldVersion){
            case 0:
                upgradeDb.createObjectStore(IndexDBHelper.RESTAURANTS, { keyPath:'id'});
            case 1:
                var restStore = upgradeDb.transaction.objectStore(IndexDBHelper.RESTAURANTS);
                restStore.createIndex(IndexDBHelper.NEIGHBORHOOD_INDEX,IndexDBHelper.NEIGHBORHOOD_PROP);
                restStore.createIndex(IndexDBHelper.CUISINE_INDEX,IndexDBHelper.CUISINE_PROP);
        }
    });
  }
  
  /**
   * Get's all the restaurants
   */
  static getAllRestaurants() {
    var dbPromise = IndexDBHelper.openDatabase();
    return dbPromise.then(function(db){
        var tx = db.transaction(IndexDBHelper.RESTAURANTS);
        var restaurantsStore = tx.objectStore(IndexDBHelper.RESTAURANTS);
        return restaurantsStore.getAll();
    });
  }

  static saveRestaurant(restaurant) {
    var dbPromise = IndexDBHelper.openDatabase();
    return dbPromise.then(function(db){
        var tx = db.transaction(IndexDBHelper.RESTAURANTS,'readwrite');
        var restStore = tx.objectStore(IndexDBHelper.RESTAURANTS);
        restStore.put(restaurant);
    });
  }

  static getRestaurantById(id) {
    var dbPromise = IndexDBHelper.openDatabase();
    return dbPromise.then(function(db){
        return db.transaction(IndexDBHelper.RESTAURANTS,'readonly')
        .objectStore(IndexDBHelper.RESTAURANTS)
        .get(id);
    });
  }

  static saveRestaurantWithPromise(dbPromise, restaurant) {
    return dbPromise.then(function(db){
        return db.transaction(IndexDBHelper.RESTAURANTS,'readwrite')
        .objectStore(IndexDBHelper.RESTAURANTS)
        .put(restaurant);
    });
  }

  static getRestaurantByIdWithPromise(dbPromise, id) {
    return dbPromise.then(function(db){
        return db.transaction(IndexDBHelper.RESTAURANTS,'readonly')
        .objectStore(IndexDBHelper.RESTAURANTS)
        .get(id);
    });
  }
}

IndexDBHelper.DB_NAME = 'stage2db';
IndexDBHelper.RESTAURANTS = 'restaurants';

IndexDBHelper.CUISINE_INDEX = 'cuisine';
IndexDBHelper.CUISINE_PROP = 'cuisine_type';

IndexDBHelper.NEIGHBORHOOD_INDEX = 'neighborhood';
IndexDBHelper.NEIGHBORHOOD_PROP = 'neighborhood';
/*========================================================================================*/

// self.importScripts('/js/indexdbhelper.js');
// self.importScripts('/js/libs/idb.js');


var WORKER_VER = 53;
var staticCacheName = 'site-static-'+WORKER_VER;
var contentImgsCache = 'site-imgs-'+WORKER_VER;
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


/*============================================indexdbhelper.js============================*/
//Should be in importScripts but didn't work for some reason!

class IndexDBHelper { 
    /**
    * Open database, and returns the promise
    */
   static openDatabase() {
     return idb.open(IndexDBHelper.DB_NAME, 5, function(upgradeDb){
         console.log('Opening database');
         switch(upgradeDb.oldVersion){
            case 0:
                upgradeDb.createObjectStore(IndexDBHelper.RESTAURANTS, { keyPath:'id'});
            case 1:
                var restStore = upgradeDb.transaction.objectStore(IndexDBHelper.RESTAURANTS);
                restStore.createIndex(IndexDBHelper.NEIGHBORHOOD_INDEX,IndexDBHelper.NEIGHBORHOOD_PROP);
                restStore.createIndex(IndexDBHelper.CUISINE_INDEX,IndexDBHelper.CUISINE_PROP);
            case 2:
                upgradeDb.createObjectStore(IndexDBHelper.REVIEWS, { keyPath:'id'});
                var restStore = upgradeDb.transaction.objectStore(IndexDBHelper.REVIEWS);
                restStore.createIndex(IndexDBHelper.REVIEWS_RESTAURANT_INDEX, IndexDBHelper.REVIEWS_RESTAURANT_INDEX_PROP);
            case 3:
                upgradeDb.createObjectStore(IndexDBHelper.FAVORITES_OUTBOX, { keyPath: 'time'});
         }
     });
   }
   
   /**
    * Get's all the reviews by restaurant ID
    */
   static getReviewsByRestaurantId(id) {
     // var dbPromise = IndexDBHelper.openDatabase();
     // return dbPromise.then(function(db){
     //     var tx = db.transaction(IndexDBHelper.REVIEWS);
     //     var reviewsStore = tx.objectStore(IndexDBHelper.REVIEWS);
     //     return reviewsStore.getAll();
     // });
 
     var dbPromise = IndexDBHelper.openDatabase();
     return dbPromise.then(function(db){
         var tx = db.transaction(IndexDBHelper.REVIEWS,'readwrite');
         var reviewStore = tx.objectStore(IndexDBHelper.REVIEWS);
         var reviewRestaurantIndex = reviewStore.index(IndexDBHelper.REVIEWS_RESTAURANT_INDEX);
         return reviewRestaurantIndex.getAll(id);
     });
   }

   /**
    * Save favorite request in store
    */
   static saveFavorite(fav) {
    var obj = { 'url':fav , 'time': Date.now()};
    var dbPromise = IndexDBHelper.openDatabase();
    return dbPromise.then(function(db){
        return db.transaction(IndexDBHelper.FAVORITES_OUTBOX,'readwrite')
        .objectStore(IndexDBHelper.FAVORITES_OUTBOX)
        .put(obj);
    });
  }

  
   /**
    * Delete favorite request in store
    */
   static deleteFavorite(fav) {
    var dbPromise = IndexDBHelper.openDatabase();
    return dbPromise.then(function(db){
        return db.transaction(IndexDBHelper.FAVORITES_OUTBOX,'readwrite')
        .objectStore(IndexDBHelper.FAVORITES_OUTBOX)
        .delete(fav.time);
    });
  }

   /**
    * Get's all favorites
    */
   static getAllFavorites() {
    var dbPromise = IndexDBHelper.openDatabase();
    return dbPromise.then(function(db){
        var tx = db.transaction(IndexDBHelper.FAVORITES_OUTBOX);
        var favstore = tx.objectStore(IndexDBHelper.FAVORITES_OUTBOX);
        return favstore.getAll();
    });
  }
 
   /**
    * Save reviews in store
    */
   static saveReviewWithPromise(dbPromise, review) {
     return dbPromise.then(function(db){
         return db.transaction(IndexDBHelper.REVIEWS,'readwrite')
         .objectStore(IndexDBHelper.REVIEWS)
         .put(review);
     });
   }
   /**
    * Save reviews in store
    */
   static saveReview(review) {
     var dbPromise = IndexDBHelper.openDatabase();
     console.log('Saving review in database',review);
     return dbPromise.then(function(db){
         return db.transaction(IndexDBHelper.REVIEWS,'readwrite')
         .objectStore(IndexDBHelper.REVIEWS)
         .put(review);
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
 
 IndexDBHelper.REVIEWS = 'reviews';
 IndexDBHelper.REVIEWS_RESTAURANT_INDEX = 'restaurant_id';
 IndexDBHelper.REVIEWS_RESTAURANT_INDEX_PROP = 'restaurant_id';
 
 IndexDBHelper.CUISINE_INDEX = 'cuisine';
 IndexDBHelper.CUISINE_PROP = 'cuisine_type';
 
 IndexDBHelper.NEIGHBORHOOD_INDEX = 'neighborhood';
 IndexDBHelper.NEIGHBORHOOD_PROP = 'neighborhood';

 IndexDBHelper.FAVORITES_OUTBOX = 'favoritesoutbox';
 /*========================================================================================*/
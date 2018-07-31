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
                var restStore = upgradeDb.transaction.objectStore(RESTAURANTS);
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
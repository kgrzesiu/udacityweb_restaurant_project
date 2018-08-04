/**
 * Common database helper functions.
 */
class DBHelper {

  static get port(){
    return 1337;
  }
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    // const port = 8000 // Change this to your server port
    // return `http://localhost:${port}/data/restaurants.json`;
    return `http://localhost:${DBHelper.port}/restaurants`;
  }

  static DATABASE_URL_ID(id) {
    return `http://localhost:${DBHelper.port}/restaurants/${id}`;
  }

  static REVIEWS_URL_RESTAURANT_ID(id){
    return `http://localhost:${DBHelper.port}/reviews/?restaurant_id=${id}`
  }

  static REVIEWS_URL_SAVE(){
    return `http://localhost:${DBHelper.port}/reviews/`
  }

  static FAVORITE_STATE_CHANGE_URL(id, state){
    return `http://localhost:${DBHelper.port}/restaurants/${id}/?is_favorite=${state}`
  }

  static returnFetchPostOption(data){
    return {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }

  static LOCAL_STORAGE_REF(){
    return 'deferedReviewLocalStorage';
  }

  /* ---------------------------- Reviews ---------------------------------*/
  /**
   * Save review
   */
  static saveReview(review) {
    //if online 
    if(navigator.onLine) {
      DBHelper.saveOnlineReview(review)
      .then(res => {
        console.log('Save review online response:', res);
      });
    } else {
      //we are not online
      DBHelper.offlineSaveReview(review);
    }

    //save to database anyway
    if (navigator.serviceWorker){
      if(navigator.serviceWorker.controller){
        navigator.serviceWorker.controller.postMessage({'action':'saveReview', 'data':review});
      } else {
        console.log('Cannot send message to service worker!')
      }
    }
  }

  static sendMessageToServiceWorker(message){
    return new Promise(function(resole,reject){
      var messageChannel = new MessageChannel();

    });
  }

  /**
   * Save review online
   */
  static saveOnlineReview(review) {
    const options = DBHelper.returnFetchPostOption(review);
    console.log('Saving review online',DBHelper.REVIEWS_URL_SAVE());
    return fetch(DBHelper.REVIEWS_URL_SAVE(), options)
    .then( response => {
      if (response.ok){
        return response.json();
      }
    }).catch(function(err){
      console.error('Save review online error', review, err);
    });
  }

  static saveReviewToLocalStorage(review){
      //save array of reviews if we are offline
      var deferedItems = localStorage.getItem(DBHelper.LOCAL_STORAGE_REF());
      if (deferedItems === null){
        deferedItems = [];
      } else {
        deferedItems = JSON.parse(deferedItems);
      }
      deferedItems.push(JSON.stringify(review));
      localStorage.setItem(DBHelper.LOCAL_STORAGE_REF(), JSON.stringify(deferedItems) );
  }
  /**
   * Save review offline
   */
  static offlineSaveReview(review) {
    //register for sync
    //How do I send the data with sync? Useless for now...
    console.log('Sync registration request');
    navigator.serviceWorker.ready.then(function(swRegistration) {
      return swRegistration.sync.register('outboxOnlineSync');
    });

    DBHelper.saveReviewToLocalStorage(review);

    //listen to online state, and try to save 
    window.addEventListener('online', ()=>{
      //get local storage
      var deferedItems = localStorage.getItem(DBHelper.LOCAL_STORAGE_REF());
      if (deferedItems !== null){
        deferedItems = JSON.parse(deferedItems);
        for (var item of deferedItems){
          DBHelper.saveOnlineReview(JSON.parse(item));
        }
      }
      localStorage.removeItem(DBHelper.LOCAL_STORAGE_REF());
    })
  }

  /* ---------------------------- Restaurants ---------------------------------*/
  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    return fetch(DBHelper.DATABASE_URL)
    .then( response => {
      if (response.ok){
        return response.json();
      }
    }).catch(function(err){
      console.log('Fetch error', err);
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    // fetch all restaurants with proper error handling.
    return fetch(DBHelper.DATABASE_URL_ID(id))
    .then( response => {
      if (response.ok){
        return response.json();
      }
    }).catch(function(err){
      console.log('Fetch error', err);
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
    .then(res => {
       
        let results = res;

        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }

        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        return results;
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods() {
    return fetch(DBHelper.DATABASE_URL)
    .then( response => {
      if (response.ok){
        return response.json()
        .then(res => {
          const neighborhoods = res.map((v, i) => res[i].neighborhood)
          // Remove duplicates from neighborhoods
          const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
          return uniqueNeighborhoods;
        });
      }
    }).catch(function(err){
      console.log('Fetch error', err);
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines() {
    return fetch(DBHelper.DATABASE_URL)
    .then( response => {
      if (response.ok){
        return response.json()
        .then(res => {
          // Get all cuisines from all restaurants
          const cuisines = res.map((v, i) => res[i].cuisine_type)
          // Remove duplicates from cuisines
          const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
          return uniqueCuisines;
        });
      }
    }).catch(function(err){
      console.log('Fetch error', err);
    });
  }

  /**
   * Fetch all reviews
   */
  static fetchReviewsByRestaurantId(id) {
    console.log('Fetch reviews by rest id:',id);
    return fetch(DBHelper.REVIEWS_URL_RESTAURANT_ID(id))
    .then( response => {
      if (response.ok){
        return response.json()
      }
    }).catch(function(err){
      console.log('Fetch error', err);
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Restaurant image alt text.
   */
  static imageAltTextForRestaurant(restaurant) {
    return (`${restaurant.name} in ${restaurant.neighborhood} `);
  }

   /**
   * Restaurant image URL Large.
   */
  static imageUrlForRestaurantL(restaurant) {
    if (restaurant.photograph === undefined){
      return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }
    return (`/img/800_${restaurant.photograph}.jpg`);
  }

  /**
   * Restaurant image URL Small.
   */
  static imageUrlForRestaurantS(restaurant) {
    if (restaurant.photograph === undefined){
      return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }
    return (`/img/400_${restaurant.photograph}.jpg`);
  }

  /**
   * Change state of the restaurante, state is a new state.
   */
  static changeFavoriteState(id, state){
    console.log("Change restaurant state",id,state);
    
    return fetch(DBHelper.FAVORITE_STATE_CHANGE_URL(id,state), { method: "PUT"})
    .then( res => {
      if (res.ok){
        return res;
      }
    }).catch(function(err){
      console.log('Change favorite state', err);
    });
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
     if (typeof L ==='undefined') return;
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      keyboard: false
      })
      marker.addTo(newMap);
    return marker;
  } 
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}


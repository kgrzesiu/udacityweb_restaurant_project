/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    // const port = 8000 // Change this to your server port
    // return `http://localhost:${port}/data/restaurants.json`;
    const port = 1337
    return `http://localhost:${port}/restaurants`;
  }

  static DATABASE_URL_ID(id) {
    const port = 1337
    return `http://localhost:${port}/restaurants/${id}`;
  }

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
        console.log('Result from restaurants',results);
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
    return (`/img/800_${restaurant.photograph}.jpg`);
  }

  /**
   * Restaurant image URL Small.
   */
  static imageUrlForRestaurantS(restaurant) {
    return (`/img/400_${restaurant.photograph}.jpg`);
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


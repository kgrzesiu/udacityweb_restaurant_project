let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []



/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initServiceWorker();
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Start service worker
 */
initServiceWorker = () => {
  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.register('/servicew.js',{
    scope: '/'
  }).then(function(){
    console.log('Service worker registered');
  }).catch(function(){
    console.log('Registration of service worker failed!');
  });
}

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods()
  .then(res => {
    self.neighborhoods = res;
    fillNeighborhoodsHTML();
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    option.setAttribute('role','menuitem');
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines()
  .then(res => {
    self.cuisines = res;
    fillCuisinesHTML();
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    option.setAttribute('role','menuitem');
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  if (typeof L == 'undefined') return;
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: $leafletToken,
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
  .then(res => {
    resetRestaurants(res);
    fillRestaurantsHTML();
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
function favoriteToggle(el,id){
  if (el.value == "false"){
    el.value = "true";
    el.innerHTML = "&hearts;";
    el.setAttribute("aria-label", "Remove from favorites");
    DBHelper.changeFavoriteState(id, true);
  } else {
    el.value = "false";
    el.innerHTML = "&#9825";
    el.setAttribute("aria-label", "Add to favorites");
    DBHelper.changeFavoriteState(id, false);
  }
}
/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  // const image = document.createElement('img');
  // image.className = 'restaurant-img';
  // image.src = DBHelper.imageUrlForRestaurant(restaurant);
  // li.append(image);

  const picture =  document.createElement('picture');
  picture.className = 'restaurant-img';
  const media_s = document.createElement('source');
  media_s.setAttribute('media','(max-width: 800px)');
  media_s.setAttribute('srcset', DBHelper.imageUrlForRestaurantS(restaurant));
  picture.appendChild(media_s);
  const media_l = document.createElement('source');
  media_l.setAttribute('media','(min-width: 800px)');
  media_l.setAttribute('srcset', DBHelper.imageUrlForRestaurantL(restaurant));
  picture.appendChild(media_l);
  const image = document.createElement('img');
  image.src = DBHelper.imageUrlForRestaurantS(restaurant);
  image.alt = DBHelper.imageAltTextForRestaurant(restaurant);
  picture.appendChild(image);
  li.append(picture);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.setAttribute('aria-label','Restaurant details link');
  more.setAttribute('role','button');
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  const favorite = document.createElement('button');
  favorite.role = 'Button';
  
  favorite.className = "favorite-button";
  //we need to check value, since sometimes is undefined, then also false
  var value = restaurant.is_favorite ? restaurant.is_favorite : false;
  var isOn = value ? "&hearts;" : "&#9825";
  favorite.innerHTML = isOn;
  favorite.value = value;
  if (value){
    favorite.setAttribute('aria-label','Remove from favorites');
  } else {
    favorite.setAttribute('aria-label','Add to favorites');
  }
  favorite.addEventListener('click', favoriteToggle.bind(null, favorite, restaurant.id), false); 
  li.append(favorite);

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    if (typeof marker ==='undefined') return;
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

} 


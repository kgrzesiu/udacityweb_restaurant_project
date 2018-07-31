let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []



/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {

  

  //Working reading and saving
  /* 
  //read all
  IndexDBHelper.getAllRestaurants()
  .then(function(res){
      console.log('Res; ',res);
  });
 

   var db = IndexDBHelper.openDatabase();
  IndexDBHelper.saveRestaurantWithPromise(db, {
    "name": "Mission Chinese Food",
    "neighborhood": "Manhattan",
    "photograph": "1",
    "address": "171 E Broadway, New York, NY 10002",
    "latlng": {
      "lat": 40.713829,
      "lng": -73.989667
    },
    "cuisine_type": "Asian",
    "operating_hours": {
      "Monday": "5:30 pm - 11:00 pm",
      "Tuesday": "5:30 pm - 11:00 pm",
      "Wednesday": "5:30 pm - 11:00 pm",
      "Thursday": "5:30 pm - 11:00 pm",
      "Friday": "5:30 pm - 11:00 pm",
      "Saturday": "12:00 pm - 4:00 pm, 5:30 pm - 12:00 am",
      "Sunday": "12:00 pm - 4:00 pm, 5:30 pm - 11:00 pm"
    },
    "reviews": [
      {
        "name": "Steve",
        "date": "October 26, 2016",
        "rating": 4,
        "comments": "Mission Chinese Food has grown up from its scrappy Orchard Street days into a big, two story restaurant equipped with a pizza oven, a prime rib cart, and a much broader menu. Yes, it still has all the hits â€” the kung pao pastrami, the thrice cooked bacon â€”but chef/proprietor Danny Bowien and executive chef Angela Dimayuga have also added a raw bar, two generous family-style set menus, and showstoppers like duck baked in clay. And you can still get a lot of food without breaking the bank."
      },
      {
        "name": "Morgan",
        "date": "October 26, 2016",
        "rating": "4",
        "comments": "This place is a blast. Must orders: GREEN TEA NOODS, sounds gross (to me at least) but these were incredible!, Kung pao pastrami (but you already knew that), beef tartare was a fun appetizer that we decided to try, the spicy ma po tofu SUPER spicy but delicous, egg rolls and scallion pancake i could have passed on... I wish we would have gone with a larger group, so much more I would have liked to try!"
      },
      {
        "name": "Jason",
        "date": "October 26, 2016",
        "rating": "3",
        "comments": "I was VERY excited to come here after seeing and hearing so many good things about this place. Having read much, I knew going into it that it was not going to be authentic Chinese. The place was edgy, had a punk rock throwback attitude, and generally delivered the desired atmosphere. Things went downhill from there though. The food was okay at best and the best qualities were easily overshadowed by what I believe to be poor decisions by the kitchen staff."
      }
    ],
    "createdAt": "2017-07-25T02:26:54.985Z",
    "updatedAt": "2017-07-25T02:26:54.985Z",
    "id": 1
  })
  .then(res => {
    console.log('Restaurant savesd', res);
  });

  IndexDBHelper.getRestaurantWithPromise(db, 1)
  .then(res => {
    console.log('Restaurant get', res);
  }); */

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

  const name = document.createElement('h1');
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
  more.setAttribute('role','link');
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

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


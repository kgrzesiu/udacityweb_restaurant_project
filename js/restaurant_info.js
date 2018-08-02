let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      if (typeof L === 'undefined') return;      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
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
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}  
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id)
    .then(res => {
      self.restaurant = res;
      fillRestaurantHTML();
      callback(null, res)
    })
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  console.log('Restaurant',restaurant);
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const simpleImage = document.getElementById('restaurant-img');
  // image.className = 'restaurant-img'
  // image.src = DBHelper.imageUrlForRestaurant(restaurant);
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
  image.id = 'restaurant-img';
  picture.appendChild(image);
  simpleImage.replaceWith(picture);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fetch & fill reviews
  DBHelper.fetchReviewsByRestaurantId(restaurant.id)
  .then(res =>{
    fillReviewsHTML(res);
  })
  .catch(err =>{
    console.log('Failed to fetch reviews by id', restaurant.id);
  });
  
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
  // if (true) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    container.appendChild(createFormHTML(self.restaurant.id));
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });

  //append form
  ul.appendChild(document.createElement('li')
                .appendChild(createFormHTML(self.restaurant.id)));

  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createFormHTML = (id) => {
  const form = document.createElement('form');
  form.className = 'commentsform';
  //cannot make it with action
  // form.action = 'http://localhost:1337/reviews/';
  //form.action = 'http://localhost:8000/reviews/';
  form.action = "#";
  form.method = 'get';
  form.innerHTML = `
  <input id="restaurant_id" name="restaurant_id" type="hidden" value="${id}">
  <label>Name:
    <input required id="review_name" name="review_name" type="text"  aria-label="User name">
  </label>
  <br>
  <label>Rating:
    <select required id="review_rating" name="review_rating" role="menu" aria-label="Select rating">
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
      <option value="5" selected>5</option>
    </select>
  </label>
  <label>Comments:
    <textarea id="review_comments" name="review_comments" rows="10" cols="40" aria-label="Review text">
    </textarea>
  </label>
  <br>
  <button type="button" onclick="submitUserForm()" aria-label="Submit review">Submit!</button>`;
  return form;
}

/**
 * Create review HTML and add it to the webpage.
 */
submitUserForm = () => {
  const postData = {
    "restaurant_id": self.restaurant.id,
    "name": document.getElementById("review_name").value,
    "rating": document.getElementById("review_rating").value,
    "comments": document.getElementById("review_comments").value
  };
  console.log('submit:',postData);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  var dateValue = new Date(review.createdAt).toLocaleString();
  date.innerHTML = dateValue;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

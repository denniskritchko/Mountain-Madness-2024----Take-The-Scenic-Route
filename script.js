const directionsRenderer = new google.maps.DirectionsRenderer();
const directionsService = new google.maps.DirectionsService();

function initMap () {
    const directionsRenderer = new google.maps.DirectionsRenderer();
    const directionsService = new google.maps.DirectionsService();

    infoWindow = new google.maps.InfoWindow();

    const locationButton = document.createElement("button");

    // New map
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 14,
        center: {lat: 49.2781, lng: -122.9199},
    });

    var pos = {lat: 49.2903, lng: -122.7905};
  
    locationButton.textContent = "Pan to Current Location";
    locationButton.classList.add("custom-map-control-button");
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);
    locationButton.addEventListener("click", () => {
      // Try HTML5 geolocation.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
  
            infoWindow.setPosition(pos);
            infoWindow.setContent("Current Location");
            infoWindow.open(map);
            map.setCenter(pos);
          },
          () => {
            handleLocationError(true, infoWindow, map.getCenter());
          },
        );
      } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
      }
    });

    directionsRenderer.setMap(map);
    
    var coords = {lat: 49.2606, lng: -123.2460};
    let numOfStops = 0;

    // If mode of transportation changes
    document.getElementById("mode").addEventListener("change", () => {
        calculateAndDisplayRoute(directionsService, directionsRenderer, coords, pos, numOfStops);
    });

    // When submit button is pressed, get number of stops from slider and calculate route
    document.getElementById("submit").addEventListener("click", () =>  {
        numOfStops = document.getElementById("range").value;
        coords = document.getElementById('destination').value;
        calculateAndDisplayRoute(directionsService, directionsRenderer, coords, pos, numOfStops, map);
    });
}

function handlePlaces(places) {
  console.log("Generated places:", places);
  return places;
}

function takeLocation(end) {
  const geocache = new google.maps.Geocoder();
  geocache.geocode({ address: end }, (results, status) => {
    if (status === "OK") {
      const endLocation = results[0].geometry.location;
      const endLatitude = endLocation.lat();
      const endLongitude = endLocation.lng();
      console.log("Geocoded end location: penis", endLatitude, endLongitude);
    } else {
      console.error("Geocoding failed:", status);
    }
  });
  return endLocation;
}

function calculateAndDisplayRoute(directionsService, directionsRenderer, end, start, numOfStops, map) {
  // Initialize geocache
  const geocache = new google.maps.Geocoder();

  // Geocode the end location
  geocache.geocode({ address: end }, (results, status) => {
    if (status === "OK") {
      const endLocation = results[0].geometry.location;
      const endLatitude = endLocation.lat();
      const endLongitude = endLocation.lng();
      console.log("Geocoded end location:", endLatitude, endLongitude);
    } else {
      console.error("Geocoding failed:", status);
    }
  });

  const selectedMode = document.getElementById("mode").value;

  var attractions = [];
  var midpoint = new google.maps.LatLng(49.2276, -123.0076);
  var r = 10000;

  // First nearby search for parks
  var requestPark = {
    location: midpoint,
    radius: r,
    type: ['park']
  };

  // Perform the nearby search for parks
  performNearbySearch(requestPark, map)
    .then(results => {
      for (var i = 0; i < results.length; i++) {
        attractions.push(results[i].name);
      }

      var places = [];

      for (var i = 0; i < numOfStops; i++) { //For level of scenicness
        var randomIndex = Math.floor(Math.random() * attractions.length); // Random nearby attraction
        console.log(attractions[randomIndex]);
        var boolean = checkWithinRadius(attractions[randomIndex], midpoint, r);
        while (!boolean){
          var randomIndex = Math.floor(Math.random() * attractions.length); // Random nearby attraction
          boolean = checkWithinRadius(attractions[randomIndex], midpoint, r);
        }
        places.push({ //Add to list 
          location: attractions[randomIndex],
          stopover: true,
        });
      }

      directionsService.route({
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode[selectedMode],
        waypoints: places,
        optimizeWaypoints: true,
      }).then((response) => {
        directionsRenderer.setDirections(response);
        const travelTime = response.routes[0].legs.reduce((acc, leg) => acc + leg.duration.value, 0);
        const hours = Math.floor(travelTime / 3600);
        const minutes = Math.floor((travelTime % 3600) / 60);
        const travelTimeElement = document.getElementById("travel-time");
        travelTimeElement.textContent = "Travel Time: " + hours + " hours " + minutes + " minutes";
      }).catch((e) => window.alert("Directions request failed due to " + e));
    })
    .catch(error => {
      console.error('Nearby search failed:', error);
    });
    takeLocation(end);
}

function performNearbySearch(request, map) {
  return new Promise((resolve, reject) => {
    service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, function (results, status) {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        resolve(results);
      } else {
        reject(status);
      }
    });
  });
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(
    browserHasGeolocation
      ? "Error: The Geolocation service failed."
      : "Error: Your browser doesn't support geolocation.",
  );
  infoWindow.open(map);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Convert latitude and longitude from degrees to radians
  var radlat1 = Math.PI * lat1 / 180;
  var radlat2 = Math.PI * lat2 / 180;
  var radlon1 = Math.PI * lon1 / 180;
  var radlon2 = Math.PI * lon2 / 180;
  // Radius of the earth in kilometers
  var R = 6371;
  // Haversine formula
  var dlat = radlat2 - radlat1;
  var dlon = radlon2 - radlon1;
  var a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
          Math.cos(radlat1) * Math.cos(radlat2) *
          Math.sin(dlon / 2) * Math.sin(dlon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var distance = R * c;
  return distance;
}

function checkWithinRadius(testLocation, midpoint, radius){
  var test=[]
  test.push({ //Add to list 
    location: testLocation,
    stopover: true,
  });

  if ((calculateDistance(test[0].lat, test[0].lng, midpoint.lat, midpoint.lng) > radius)){
    return false;
  }
  return true;
}

window.initMap = initMap;
function calculatePosition(height, speed, heading, climbrate, currentLocation) {
  var gravitation = 9.81;
  var mass = $('#wl_mass')[0].value;                      // kg
  var length = $('#wl_length')[0].value;                  // m
  var radius = $('#wl_radius')[0].value;                  // m
  var density = $('#a_density')[0].value;                 // rho
  var windSpeed = $('#w_speed')[0].value;                 // m/s
  var fieldElevation = parseFloat($('#f_elevation')[0].value);      // ft
  var windHeading = parseFloat($('#w_heading')[0].value);          // degrees
  var dragCoefficient = $('#dragCoefficient')[0].value;
  
  var speed_aircraft = {
    x : speed * Math.sin(heading / 180 * Math.PI),
    y : speed * Math.cos(heading / 180 * Math.PI),
    z : climbrate
  }

  var speed_air = {
    x : windSpeed * Math.sin(windHeading / 180 * Math.PI),
    y : windSpeed * Math.cos(windHeading / 180 * Math.PI),
    z : 0
  }

  var cHeight = height;

  var dist = {
    x : 0,
    y : 0
  }

  var dt = 0.1;

  console.log('height = ' + cHeight);

  while(cHeight > fieldElevation){
    var Fz = {
      x : 0,
      y : 0,
      z : -mass * gravitation
    }

    var airSpeed = {
      x : speed_aircraft.x + speed_air.x,
      y : speed_aircraft.y + speed_air.y,
      z : speed_aircraft.z + speed_air.z
    }

    var Fl = {
      x : dragCoefficient * Math.pow(airSpeed.x, 2),
      y : dragCoefficient * Math.pow(airSpeed.y, 2),
      z : dragCoefficient * Math.pow(airSpeed.z, 2)
    }

    if(airSpeed.x > 0) Fl.x *= -1;
    if(airSpeed.y > 0) Fl.y *= -1;
    if(airSpeed.z > 0) Fl.z *= -1;

    var Fres = {
      x : Fz.x + Fl.x,
      y : Fz.y + Fl.y,
      z : Fz.z + Fl.z
    }

    var a = {
      x : Fres.x / mass,
      y : Fres.y / mass,
      z : Fres.z / mass
    }

    speed_aircraft.x = speed_aircraft.x + a.x * dt;
    speed_aircraft.y = speed_aircraft.y + a.y * dt;
    speed_aircraft.z = speed_aircraft.z + a.z * dt;

    dist.x = dist.x + speed_aircraft.x * dt;
    dist.y = dist.y + speed_aircraft.y * dt;

    cHeight = cHeight + speed_aircraft.z * dt;
  }

  var distance = Math.sqrt(Math.pow(dist.x, 2) + Math.pow(dist.y, 2));
  var heading = Math.atan2(dist.x, dist.y) * 180 / Math.PI;
  
  console.log(currentLocation, heading, dist.x, dist.y);

  return L.GeometryUtil.destination(currentLocation, heading, distance);
  // ToDo: Now calculate the deceleration of the weak link caused by disconnection of the aircraft
}

var map, featureList, boroughSearch = [], theaterSearch = [], museumSearch = [];

$(window).resize(function() {
  sizeLayerControl();
});

if ( !("ontouchstart" in window) ) {
  $(document).on("mouseover", ".feature-row", function(e) {
    highlight.clearLayers().addLayer(L.circleMarker([$(this).attr("lat"), $(this).attr("lng")], highlightStyle));
  });
}
$('.calculate_btn').on('click', function(){
  calculatePosition();
});

$(document).on("mouseout", ".feature-row", clearHighlight);

$("#full-extent-btn").click(function() {
  $(".navbar-collapse.in").collapse("hide");
  return false;
});

$("#list-btn").click(function() {
  animateSidebar();
  return false;
});

$("#nav-btn").click(function() {
  $(".navbar-collapse").collapse("toggle");
  return false;
});

$("#sidebar-toggle-btn").click(function() {
  animateSidebar();
  return false;
});

$("#sidebar-hide-btn").click(function() {
  animateSidebar();
  return false;
});

function animateSidebar() {
  $("#sidebar").animate({
    width: "toggle"
  }, 350, function() {
    map.invalidateSize();
  });
}

function sizeLayerControl() {
  $(".leaflet-control-layers").css("max-height", $("#map").height() - 50);
}

function clearHighlight() {
  highlight.clearLayers();
}

/* Basemap Layers */
var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});
var cartoLight = L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>'
});

/* Overlay Layers */
var highlight = L.geoJson(null);
var highlightStyle = {
  stroke: false,
  fillColor: "#00FFFF",
  fillOpacity: 0.7,
  radius: 10
};

function getColor(value){
  //value from 0 to 1
  var hue=((1-value)*120).toString(10);
  return ["hsl(",hue,",75%,50%)"].join("");
}

map = L.map("map", {
  zoom: 16,
  center: [51.44866667, 4.348],
  layers: [cartoLight, Esri_WorldImagery],
  zoomControl: false,
  attributionControl: false
});


  $.getJSON("data/flight.json", function (data) {
    var top = 0;
    var heighestDataIndex = 0;
    
    for (var i = 0; i < data.length; i++) {
      if (top < data[i].altitude){
        top = data[i].altitude;
        heighestDataIndex = i;
      }
    }

    var points = [];
    
    var num = parseFloat($('#datapoints')[0].value);
    
    for (var i = data.length - 1; i > 0; i--) {
      var currentLocation = new L.LatLng(data[i].location.lat, data[i].location.lng);
      var polyline = new L.polyline([
        new L.LatLng(data[i - 1].location.lat, data[i-1].location.lng),
        currentLocation
      ], {
        color: getColor(1-(data[i].altitude/top)),
        weight: 5,
        opacity: 1,
        smoothFactor: 1
      });
    
      polyline.addTo(map);
    }

    console.log("heighest Index = " + heighestDataIndex + ", height = " + data[heighestDataIndex].altitude + ", top = " + top);

    var location = new L.LatLng(data[heighestDataIndex].location.lat, data[heighestDataIndex].location.lng);

    var beginCircle = new L.circleMarker(location, {
      color: 'red',
      radius : 10
    });

    beginCircle.addTo(map);


    var point = calculatePosition(data[heighestDataIndex].altitude * 0.304, data[heighestDataIndex].speed * 0.514444444, data[heighestDataIndex].heading, data[heighestDataIndex].climbrate , location);

    var circle = new L.circleMarker(point, {
      color: 'dodgerblue',
      radius : 30
    });

    circle.addTo(map);
  });


/* Clear feature highlight when map is clicked */
map.on("click", function(e) {
  highlight.clearLayers();
});

/* Attribution control */
function updateAttribution(e) {
  $.each(map._layers, function(index, layer) {
    if (layer.getAttribution) {
      $("#attribution").html((layer.getAttribution()));
    }
  });
}
map.on("layeradd", updateAttribution);
map.on("layerremove", updateAttribution);

var attributionControl = L.control({
  position: "bottomright"
});
attributionControl.onAdd = function (map) {
  var div = L.DomUtil.create("div", "leaflet-control-attribution");
  div.innerHTML = "<span class='hidden-xs'>Developed by <a href='http://bryanmcbride.com'>bryanmcbride.com</a> | </span><a href='#' onclick='$(\"#attributionModal\").modal(\"show\"); return false;'>Attribution</a>";
  return div;
};
map.addControl(attributionControl);

var zoomControl = L.control.zoom({
  position: "bottomright"
}).addTo(map);

/* Larger screens get expanded layer control and visible sidebar */
if (document.body.clientWidth <= 767) {
  var isCollapsed = true;
} else {
  var isCollapsed = false;
}

var baseLayers = {
  "Street Map": cartoLight,
  "ESRI Imagery": Esri_WorldImagery
};

var groupedOverlays = {};

var layerControl = L.control.groupedLayers(baseLayers, groupedOverlays, {
  collapsed: isCollapsed
}).addTo(map);

// Leaflet patch to make layer control scrollable on touch browsers
var container = $(".leaflet-control-layers")[0];
if (!L.Browser.touch) {
  L.DomEvent
  .disableClickPropagation(container)
  .disableScrollPropagation(container);
} else {
  L.DomEvent.disableClickPropagation(container);
}

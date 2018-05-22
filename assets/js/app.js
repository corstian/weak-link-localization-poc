// Some function which are required to calculate the location where the weak link fell.
function combineVectors(v1, v2) {
  // ToDo: Combine vector 1 and vector 2
}

function calculateTerminalVelocity(mass, gravitation, density, area, dragCoefficient) {
  return Math.sqrt((2*mass*gravitation)/(density*area*dragCoefficient));
}

function calculateDistance(gravitation, terminalVelocity, time) {
  var ret = 
    Math.pow(terminalVelocity, 2) * 
    Math.log(
      0.5 * (
          Math.pow(Math.E, -((gravitation*time)/terminalVelocity))
        + Math.pow(Math.E,   (gravitation*time)/terminalVelocity) ))
    / gravitation;
  
  return ret;
}

function calculateWindLoad(area, velocity, dragCoefficient) {
  // F = A x P x Cd

  // var area = Math.PI * radius * length;
  var pressure = 0.613*Math.pow(velocity, 2);
  return area * pressure * dragCoefficient;
}

function calculatePosition(height, speed, currentLocation) {
  var gravitation = 9.81;
  var mass = $('#wl_mass')[0].value;                      // kg
  var length = $('#wl_length')[0].value;                  // m
  var radius = $('#wl_radius')[0].value;                  // m
  var density = $('#a_density')[0].value;                 // rho
  var windSpeed = $('#w_speed')[0].value;                 // m/s
  var fieldElevation = parseFloat($('#f_elevation')[0].value);      // ft
  var windHeading = parseFloat($('#w_heading')[0].value);          // degrees
  var dragCoefficient = $('#dragCoefficient')[0].value;
  

  var area = Math.PI * radius * length;

  var terminalVelocity = calculateTerminalVelocity(mass, gravitation, density, area, dragCoefficient);

  var previousDelta = 999;
  var delta = 0;
  var stepSize = 1;
  var time = 0;
  
  // console.log("h", height, fieldElevation, height - fieldElevation);
  height = height - fieldElevation;
  

  // Because I suck at math I just brute force the time a piece is falling
  while (delta <= previousDelta) {
    delta = height - calculateDistance(gravitation, terminalVelocity, time);
    delta = delta < 0 ? -delta : delta;
    time += stepSize;
    
    if (delta < previousDelta) previousDelta = delta;
  }

  // Now calculate the force the wind applies on the weak link
  var windLoad = calculateWindLoad(area, windSpeed, dragCoefficient);
  var windAcceleration = windLoad / mass;
  var windDistance = windAcceleration * time;   // Combine this with the wind heading and we got ourselves a vector
  
  console.log(currentLocation, windHeading, windDistance);

  return L.GeometryUtil.destination(currentLocation, (windHeading + 180) % 360, windDistance);
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
  center: [51.44866667,	4.348],
  layers: [cartoLight, Esri_WorldImagery],
  zoomControl: false,
  attributionControl: false
});

$.getJSON("data/flight.json", function (data) {
  var top = 0;
  
  for (var i = 0; i < data.length; i++) {
    if (top < data[i].altitude) top = data[i].altitude;
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
    
    if (i >= data.length - num) points.push(calculatePosition(data[i].altitude * 0.3048, data[i].speed * 0.514444444, currentLocation));
  }

  var walkPolyline = new L.polyline(points, {
    color: 'dodgerblue',
    weight: 3,
    opacity: 1,
    smoothFactor: 1
  });

  walkPolyline.addTo(map);
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

/* eslint-disable*/

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiYWRkZXItbmVvIiwiYSI6ImNrZndyc241czA3M2Uyd3FkeGRrN3FsNW4ifQ.uqAlBEw0sXgqn-5_L0UCEg';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/adder-neo/ckfwsfw9g6aml19nrszwds8n6',
    scrollZoom: false,
    // center: [-118.550473, 34.228203],
    // zoom: 8,
    // interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    //Add marker
    const el = document.createElement('div');
    el.className = 'marker';

    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({
      offset: 40,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);
    //Extend the map bounds to include currect locations
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      left: 100,
      right: 100,
      bottom: 200,
    },
  });
};

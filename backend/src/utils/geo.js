// Calculate bounding box for given latitude, longitude and radius (km)
function bbox(lat, lng, radius_km) {
  const latR = radius_km / 110.574;
  const lngR = radius_km / (111.320 * Math.cos((lat * Math.PI) / 180));
  return {
    latMin: lat - latR,
    latMax: lat + latR,
    lngMin: lng - lngR,
    lngMax: lng + lngR,
  };
}

module.exports = { bbox };
function bbox(lat, lng, radiusKm) {
  const delta = radiusKm / 111.0;
  return {
    latMin: lat - delta,
    latMax: lat + delta,
    lngMin: lng - delta,
    lngMax: lng + delta,
  };
}
module.exports = { bbox };
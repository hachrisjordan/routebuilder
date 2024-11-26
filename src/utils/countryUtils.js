export const getUniqueCountries = (airports) => {
  const countries = new Set(airports.map(airport => airport.Country));
  return Array.from(countries).sort();
}; 
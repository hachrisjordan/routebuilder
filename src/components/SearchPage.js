import React, { useState, useEffect } from 'react';
import { AirportSearch } from './AirportSearch';
import { FlightResults } from './FlightResults';
import UA_miles from '../data/UA_miles.json';
import SQ_miles from '../data/SQ_miles.json';
import LH_miles from '../data/LH_miles.json';
import LX_miles from '../data/LX_miles.json';
import TG_miles from '../data/TG_miles.json';
import BR_miles from '../data/BR_miles.json';
import NH_miles from '../data/NH_miles.json';
import OS_miles from '../data/OS_miles.json';
import OZ_miles from '../data/OZ_miles.json';
import NZ_miles from '../data/NZ_miles.json';   
import SA_miles from '../data/SA_miles.json';
import AI_miles from '../data/AI_miles.json';
import LO_miles from '../data/LO_miles.json';
import SN_miles from '../data/SN_miles.json'; 
import A3_miles from '../data/A3_miles.json';
import TP_miles from '../data/TP_miles.json';
import MS_miles from '../data/MS_miles.json';
import WY_miles from '../data/WY_miles.json';
import GF_miles from '../data/GF_miles.json';
import AC_miles from '../data/AC_miles.json';
import { airports } from '../data/airports';

const COTERMINALS = {
  // North America
  'CHI': ['MDW', 'ORD'],
  'DAL': ['DFW', 'DAL'],
  'HOU': ['IAH', 'HOU'],
  'NYC': ['JFK', 'LGA', 'EWR'],
  'SFL': ['FLL', 'MIA', 'PBI'],
  'YTO': ['YTZ', 'YHM', 'YYZ'],
  'WAS': ['IAD', 'DCA'],
  
  // South America
  'BUE': ['AEP', 'EZE'],
  'RIO': ['GIG', 'SDU'],
  'SAO': ['CGH', 'GRU', 'VCP'],
  
  // Europe
  'IST': ['IST', 'SAW'],
  'LON': ['LCY', 'LGW', 'LHR', 'LTN', 'STN'],
  'MIL': ['BGY', 'LIN', 'MXP'],
  'MOW': ['DME', 'SVO', 'VNO', 'ZIA'],
  'PAR': ['CDG', 'ORY'],
  'STO': ['ARN', 'BMA'],
  
  // Asia
  'BJS': ['PEK', 'PKX'],
  'JKT': ['CGK', 'HLP'],
  'OSA': ['ITM', 'KIX', 'UKB'],
  'SPK': ['CTS', 'OKD'],
  'SEL': ['GMP', 'ICN'],
  'SHA': ['SHA', 'PVG'],
  'TPE': ['TSA', 'TPE'],
  'TYO': ['HND', 'NRT']
};

function getCoTerminalGroup(airport) {
  for (const [group, airports] of Object.entries(COTERMINALS)) {
    if (airports.includes(airport)) {
      return group;
    }
  }
  return null;
}

function isValidCoTerminalRoute(newSegment, existingPath) {
  const allAirports = [
    ...existingPath.map(seg => seg.Departure_IATA),
    ...existingPath.map(seg => seg.Arrival_IATA),
    newSegment["Departure IATA"],
    newSegment["Arrival IATA"]
  ];
  
  const usedCoTerminals = new Map();
  
  for (const airport of allAirports) {
    const coTerminalGroup = getCoTerminalGroup(airport);
    if (coTerminalGroup) {
      if (usedCoTerminals.has(coTerminalGroup)) {
        // If we already used a different airport from this co-terminal group
        if (usedCoTerminals.get(coTerminalGroup) !== airport) {
          return false;
        }
      } else {
        usedCoTerminals.set(coTerminalGroup, airport);
      }
    }
  }
  
  return true;
}

// Constants for region restrictions
const EUROPEAN_COUNTRIES = new Set([
  'Germany', 'United Kingdom', 'France', 'Italy', 'Spain', 'Poland', 'Ukraine', 
  'Romania', 'Netherlands', 'Belgium', 'Czechia', 'Sweden', 'Portugal', 'Greece',
  'Hungary', 'Austria', 'Belarus', 'Switzerland', 'Bulgaria', 'Serbia', 'Denmark',
  'Finland', 'Norway', 'Slovakia', 'Ireland', 'Croatia', 'Bosnia And Herzegovina',
  'Moldova', 'Lithuania', 'Albania', 'Slovenia', 'Latvia', 'North Macedonia',
  'Estonia', 'Luxembourg', 'Montenegro', 'Malta', 'Iceland'
]);

export function SearchPage() {
  // State for selected airports and search results
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // Calculates direct distance between airports using Haversine formula
  function calculateDirectDistance(origin, destination) {
    const originAirport = airports.find(a => a.IATA === origin);
    const destAirport = airports.find(a => a.IATA === destination);
    
    if (!originAirport || !destAirport) return null;

    const R = 3959; // Earth's radius in miles
    const lat1 = originAirport.Latitude * Math.PI / 180;
    const lat2 = destAirport.Latitude * Math.PI / 180;
    const dLat = (destAirport.Latitude - originAirport.Latitude) * Math.PI / 180;
    const dLon = (destAirport.Longitude - originAirport.Longitude) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(lat1) * Math.cos(lat2) *
             Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Recursive function to find all valid routes between origin and destination
  // Constraints:
  // - Maximum 4 segments (3 stops)
  // - Total distance <= 2x direct distance
  // - No revisiting airports
  // - No backtracking to previously visited countries (except direct connections)
  // - Maximum 2 layovers in US/Canada unless both origin and destination are in US/Canada
  const findPossibleRoutes = (origin, destination, visited = new Set(), visitedCountries = new Set(), path = [], directDistance = null) => {
    const allRoutes = [...UA_miles, ...SQ_miles, ...LH_miles, ...LX_miles, ...TG_miles, ...BR_miles, ...NH_miles, ...OS_miles, ...OZ_miles, ...NZ_miles, ...SA_miles, ...AI_miles, ...LO_miles, ...SN_miles, ...A3_miles, ...TP_miles, ...MS_miles, ...WY_miles, ...GF_miles, ...AC_miles];
    const routes = [];

    // Get origin and destination airport details for US/Canada check
    const originAirport = airports.find(a => a.IATA === origin);
    const destAirport = airports.find(a => a.IATA === destination);
    const isOriginNorthAmerica = ['United States', 'Canada'].includes(originAirport?.Country);
    const isDestNorthAmerica = ['United States', 'Canada'].includes(destAirport?.Country);
    const bothInNorthAmerica = isOriginNorthAmerica && isDestNorthAmerica;

    // Count existing US/Canada layovers in the current path
    const northAmericaLayovers = path.reduce((count, segment) => {
      const layoverAirport = airports.find(a => a.IATA === segment.Arrival_IATA);
      return count + (['United States', 'Canada'].includes(layoverAirport?.Country) ? 1 : 0);
    }, 0);

    // Count existing European layovers in the current path
    const europeanLayovers = path.reduce((count, segment) => {
      const layoverAirport = airports.find(a => a.IATA === segment.Arrival_IATA);
      return count + (EUROPEAN_COUNTRIES.has(layoverAirport?.Country) ? 1 : 0);
    }, 0);

    // Calculate direct distance if not provided
    if (directDistance === null) {
      directDistance = calculateDirectDistance(origin, destination);
      if (!directDistance) return [];
    }

    // Base case: if we've found a path to the destination
    if (path.length > 0 && path[path.length - 1].Arrival_IATA === destination) {
      const totalDistance = path.reduce((sum, segment) => sum + segment.Distance, 0);
      if (totalDistance <= directDistance * 2) {
        return [path];
      }
      return [];
    }

    // Don't allow paths longer than 6 segments (5 stops)
    if (path.length >= 4) {
      return [];
    }

    // Get current point and its country
    const currentPoint = path.length === 0 ? origin : path[path.length - 1].Arrival_IATA;
    const currentAirport = airports.find(a => a.IATA === currentPoint);
    
    if (!currentAirport) return [];

    // Get all possible next segments
    const possibleSegments = allRoutes.filter(route => {
      if (route["Departure IATA"] !== currentPoint) return false;
      
      // Add co-terminal validation
      if (!isValidCoTerminalRoute(route, path)) {
        return false;
      }
      
      // Get the arrival airport details
      const arrivalAirport = airports.find(a => a.IATA === route["Arrival IATA"]);
      if (!arrivalAirport) return false;

      // Check if adding this segment would exceed US/Canada layover limit
      const isArrivalNorthAmerica = ['United States', 'Canada'].includes(arrivalAirport.Country);
      if (isArrivalNorthAmerica && !bothInNorthAmerica && northAmericaLayovers >= 2) {
        return false;
      }

      // Check if adding this segment would exceed European layover limit
      const isEuropeanArrival = EUROPEAN_COUNTRIES.has(arrivalAirport.Country);
      if (isEuropeanArrival && europeanLayovers >= 2) {
        return false;
      }

      // Check if we're not backtracking to a visited airport
      if (visited.has(route["Arrival IATA"])) return false;

      // Check if we're not backtracking to a visited country
      // Exception: Allow same country connection if it's a direct continuation
      const isBacktrackingCountry = visitedCountries.has(arrivalAirport.Country) &&
                                  arrivalAirport.Country !== currentAirport.Country;
      if (isBacktrackingCountry) return false;

      return true;
    });

    // Try each possible next segment
    for (const segment of possibleSegments) {
      const arrivalAirport = airports.find(a => a.IATA === segment["Arrival IATA"]);
      
      // Calculate running total distance
      const currentTotalDistance = path.reduce((sum, seg) => sum + seg.Distance, 0) + 
                               segment["Flight Distance (miles)"];
      
      // Skip this path if it's already over 2x direct distance
      if (currentTotalDistance > directDistance * 2) {
        continue;
      }

      // Update visited sets
      const newVisited = new Set(visited);
      newVisited.add(segment["Arrival IATA"]);
      
      const newVisitedCountries = new Set(visitedCountries);
      newVisitedCountries.add(arrivalAirport.Country);

      const newPath = [...path, {
        Departure_IATA: segment["Departure IATA"],
        Arrival_IATA: segment["Arrival IATA"],
        Distance: segment["Flight Distance (miles)"],
        Country: arrivalAirport.Country // Add country info for reference
      }];

      const newRoutes = findPossibleRoutes(
        origin,
        destination,
        newVisited,
        newVisitedCountries,
        newPath,
        directDistance
      );

      routes.push(...newRoutes);
    }

    return routes;
  };

  // Handles the search button click
  // Updates URL parameters and finds possible routes
  const handleSearch = () => {
    if (departureAirport && arrivalAirport) {
      const params = new URLSearchParams();
      params.set('from', departureAirport);
      params.set('to', arrivalAirport);
      
      window.history.pushState(
        {}, 
        '', 
        `${window.location.pathname}?${params.toString()}`
      );
      
      const originAirport = airports.find(a => a.IATA === departureAirport);
      const visited = new Set([departureAirport]);
      const visitedCountries = new Set([originAirport.Country]);
      
      const routes = findPossibleRoutes(
        departureAirport, 
        arrivalAirport, 
        visited,
        visitedCountries
      );
      
      setSearchResults(routes);
      setShowResults(true);
    }
  };

  return (
    <div className="search-container">
      <div className="search-boxes">
        <AirportSearch 
          label="Departure"
          value={departureAirport}
          onChange={setDepartureAirport}
        />
        <AirportSearch 
          label="Arrival"
          value={arrivalAirport}
          onChange={setArrivalAirport}
        />
        <button onClick={handleSearch}>Search Flights</button>
      </div>
      <FlightResults 
        results={searchResults} 
        isVisible={showResults}
      />
    </div>
  );
} 

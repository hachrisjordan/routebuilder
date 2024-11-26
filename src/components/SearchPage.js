import React, { useState, useEffect, useMemo } from 'react';
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
import { getUniqueCountries } from '../utils/countryUtils';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';

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

// First, let's create a helper function to check if a route avoids certain countries
const isRouteAvoidingCountries = (route, avoidCountries) => {
  // Check each airport in the route
  for (const segment of route) {
    const departureAirport = airports.find(a => a.IATA === segment.Departure_IATA);
    const arrivalAirport = airports.find(a => a.IATA === segment.Arrival_IATA);
    
    // If any airport in the route is in an avoided country, return false
    if (departureAirport && avoidCountries.includes(departureAirport.Country)) {
      return false;
    }
    if (arrivalAirport && avoidCountries.includes(arrivalAirport.Country)) {
      return false;
    }
  }
  return true;
};

// Create airlines list from your JSON imports
const airlines = [
  { value: 'A3', label: 'Aegean Airlines (A3)' },
  { value: 'AC', label: 'Air Canada (AC)' },
  { value: 'AI', label: 'Air India (AI)' },
  { value: 'NZ', label: 'Air New Zealand (NZ)' },
  { value: 'NH', label: 'All Nippon Airways (NH)' },
  { value: 'OZ', label: 'Asiana Airlines (OZ)' },
  { value: 'OS', label: 'Austrian Airlines (OS)' },
  { value: 'SN', label: 'Brussels Airlines (SN)' },
  { value: 'MS', label: 'EgyptAir (MS)' },
  { value: 'BR', label: 'EVA Air (BR)' },
  { value: 'GF', label: 'Gulf Air (GF)' },
  { value: 'LO', label: 'LOT Polish Airlines (LO)' },
  { value: 'LH', label: 'Lufthansa (LH)' },
  { value: 'WY', label: 'Oman Air (WY)' },
  { value: 'SQ', label: 'Singapore Airlines (SQ)' },
  { value: 'SA', label: 'South African Airways (SA)' },
  { value: 'LX', label: 'Swiss International Air Lines (LX)' },
  { value: 'TP', label: 'TAP Air Portugal (TP)' },
  { value: 'TG', label: 'Thai Airways (TG)' },
  { value: 'UA', label: 'United Airlines (UA)' }
].sort((a, b) => a.label.localeCompare(b.label));

// Helper function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Calculate total distance for a route
const calculateRouteDistance = (route) => {
  let totalDistance = 0;
  
  for (let i = 0; i < route.length; i++) {
    const segment = route[i];
    const departureAirport = airports.find(a => a.IATA === segment.Departure_IATA);
    const arrivalAirport = airports.find(a => a.IATA === segment.Arrival_IATA);
    
    if (departureAirport && arrivalAirport) {
      const segmentDistance = calculateDistance(
        departureAirport.Latitude,
        departureAirport.Longitude,
        arrivalAirport.Latitude,
        arrivalAirport.Longitude
      );
      totalDistance += segmentDistance;
    }
  }
  
  return totalDistance;
};

export function SearchPage() {
  // State for selected airports and search results
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [avoidCountries, setAvoidCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [avoidAirlines, setAvoidAirlines] = useState([]);

  // Get the country options when component mounts
  const countryOptions = useMemo(() => {
    return getUniqueCountries(airports);
  }, []);

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
  const handleSearch = async () => {
    // Show loading overlay immediately
    setIsLoading(true);
    setShowResults(false);

    try {
      // Wait for 250ms to ensure overlay is visible
      await new Promise(resolve => setTimeout(resolve, 250));

      if (departureAirport && arrivalAirport) {
        const params = new URLSearchParams();
        params.set('from', departureAirport);
        params.set('to', arrivalAirport);
        params.set('avoidCountries', avoidCountries.join(','));
        
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
        
        // Filter out routes that go through avoided countries
        const filteredRoutes = routes.filter(route => 
          isRouteAvoidingCountries(route, avoidCountries)
        );
        
        // Sort routes by total distance
        const sortedRoutes = filteredRoutes.sort((a, b) => {
          const distanceA = calculateRouteDistance(a);
          const distanceB = calculateRouteDistance(b);
          return distanceA - distanceB; // Low to high
        });
        
        setSearchResults(sortedRoutes);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Error searching routes:', error);
    } finally {
      // Add a small delay before hiding loading screen for smoother transition
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsLoading(false);
    }
  };

  // Airport search with better IATA and name prioritization
  const getAirportOptions = (inputValue) => {
    if (!inputValue) return [];
    
    const input = inputValue.toLowerCase().trim();
    
    // Priority 1: Exact IATA match
    const exactIataMatches = airports.filter(airport => 
      airport.IATA.toLowerCase() === input
    );

    // Priority 2: IATA starts with input
    const startingIataMatches = airports.filter(airport => 
      airport.IATA.toLowerCase().startsWith(input) &&
      !exactIataMatches.includes(airport)
    );

    // Priority 3: Airport name starts with input
    const startingNameMatches = airports.filter(airport => 
      airport.Name.toLowerCase().startsWith(input) &&
      !exactIataMatches.includes(airport) &&
      !startingIataMatches.includes(airport)
    );

    // Priority 4: Airport name contains input
    const containingNameMatches = airports.filter(airport => 
      airport.Name.toLowerCase().includes(input) &&
      !exactIataMatches.includes(airport) &&
      !startingIataMatches.includes(airport) &&
      !startingNameMatches.includes(airport)
    );

    // Combine all matches with proper ordering
    const allMatches = [
      ...exactIataMatches,
      ...startingIataMatches,
      ...startingNameMatches,
      ...containingNameMatches
    ].slice(0, 5); // Limit to 5 results

    return allMatches.map(airport => ({
      value: airport.IATA,
      label: `${airport.IATA} - ${airport.Name} (${airport.Country})`
    }));
  };

  // Country search with progressive character matching
  const getCountryOptions = (inputValue) => {
    if (!inputValue) return [];

    const input = inputValue.toLowerCase().trim();
    const countries = getUniqueCountries(airports);
    
    // First: Exact matches
    const exactMatches = countries.filter(country => 
      country.toLowerCase() === input
    );

    // Second: Starting matches (progressive matching)
    const startingMatches = countries.filter(country => 
      country.toLowerCase().startsWith(input) &&
      !exactMatches.includes(country)
    );

    // Third: Progressive character matching
    const progressiveMatches = countries.filter(country => {
      if (exactMatches.includes(country) || startingMatches.includes(country)) {
        return false;
      }
      
      const countryChars = country.toLowerCase();
      let lastIndex = -1;
      
      // Check if characters appear in sequence
      for (const char of input) {
        const index = countryChars.indexOf(char, lastIndex + 1);
        if (index === -1) return false;
        lastIndex = index;
      }
      
      return true;
    });

    // Combine all matches with proper ordering
    const allMatches = [
      ...exactMatches,
      ...startingMatches,
      ...progressiveMatches
    ].slice(0, 5); // Limit to 5 results

    return allMatches.map(country => ({
      value: country,
      label: country
    }));
  };

  const filterCountries = (inputValue) => {
    if (!inputValue) return [];
    
    const input = inputValue.toLowerCase().trim();
    const countries = getUniqueCountries(airports);
    
    // Priority 1: Exact matches
    const exactMatches = countries.filter(country => 
      country.toLowerCase() === input
    );

    // Priority 2: Starts with input
    const startingMatches = countries.filter(country => 
      country.toLowerCase().startsWith(input) &&
      !exactMatches.includes(country)
    );

    // Priority 3: Contains input
    const containingMatches = countries.filter(country => 
      country.toLowerCase().includes(input) &&
      !exactMatches.includes(country) &&
      !startingMatches.includes(country)
    );

    return [...exactMatches, ...startingMatches, ...containingMatches]
      .slice(0, 5)
      .map(country => ({
        value: country,
        label: country
      }));
  };

  const loadCountryOptions = (inputValue) => 
    new Promise((resolve) => {
      resolve(filterCountries(inputValue));
    });

  const filterAirports = (inputValue) => {
    if (!inputValue) return [];
    
    const input = inputValue.toLowerCase().trim();
    
    // Filter out airports from avoided countries first
    const availableAirports = airports.filter(airport => 
      !avoidCountries.includes(airport.Country)
    );
    
    // Priority 1: Exact IATA match
    const exactIataMatches = availableAirports.filter(airport => 
      airport.IATA.toLowerCase() === input
    );

    // Priority 2: IATA starts with input
    const startingIataMatches = availableAirports.filter(airport => 
      airport.IATA.toLowerCase().startsWith(input) &&
      !exactIataMatches.includes(airport)
    );

    // Priority 3: Airport name starts with input
    const startingNameMatches = availableAirports.filter(airport => 
      airport.Name.toLowerCase().startsWith(input) &&
      !exactIataMatches.includes(airport) &&
      !startingIataMatches.includes(airport)
    );

    // Priority 4: Airport name contains input
    const containingNameMatches = availableAirports.filter(airport => 
      airport.Name.toLowerCase().includes(input) &&
      !exactIataMatches.includes(airport) &&
      !startingIataMatches.includes(airport) &&
      !startingNameMatches.includes(airport)
    );

    // Combine all matches with proper ordering
    const allMatches = [
      ...exactIataMatches,
      ...startingIataMatches,
      ...startingNameMatches,
      ...containingNameMatches
    ].slice(0, 5); // Limit to 5 results

    return allMatches.map(airport => ({
      value: airport.IATA,
      label: `${airport.IATA} - ${airport.Name} (${airport.Country})`
    }));
  };

  const loadAirportOptions = (inputValue) => 
    new Promise((resolve) => {
      resolve(filterAirports(inputValue));
    });

  // Filter airlines function
  const filterAirlines = (inputValue) => {
    if (!inputValue) return airlines;
    
    const input = inputValue.toLowerCase().trim();
    
    // Priority 1: Exact airline code match
    const exactCodeMatches = airlines.filter(airline => 
      airline.value.toLowerCase() === input
    );

    // Priority 2: Starting airline code match
    const startingCodeMatches = airlines.filter(airline => 
      airline.value.toLowerCase().startsWith(input) &&
      !exactCodeMatches.includes(airline)
    );

    // Priority 3: Airline name contains input
    const nameMatches = airlines.filter(airline => 
      airline.label.toLowerCase().includes(input) &&
      !exactCodeMatches.includes(airline) &&
      !startingCodeMatches.includes(airline)
    );

    return [...exactCodeMatches, ...startingCodeMatches, ...nameMatches];
  };

  const loadAirlineOptions = (inputValue) => 
    new Promise((resolve) => {
      resolve(filterAirlines(inputValue));
    });

  // Also clear selected airports if their country is now avoided
  useEffect(() => {
    if (departureAirport) {
      const departureCountry = airports.find(a => a.IATA === departureAirport)?.Country;
      if (departureCountry && avoidCountries.includes(departureCountry)) {
        setDepartureAirport('');
      }
    }
    
    if (arrivalAirport) {
      const arrivalCountry = airports.find(a => a.IATA === arrivalAirport)?.Country;
      if (arrivalCountry && avoidCountries.includes(arrivalCountry)) {
        setArrivalAirport('');
      }
    }
  }, [avoidCountries, departureAirport, arrivalAirport]);

  return (
    <div className="search-container">
      <div className="search-boxes">
        <div className="airport-search">
          <div className="search-parameter departure-parameter">
            <label style={{ fontWeight: 700 }}>Departure Airport:</label>
            <AsyncSelect
              className="select-input"
              cacheOptions
              defaultOptions
              value={departureAirport ? {
                value: departureAirport,
                label: airports.find(a => a.IATA === departureAirport)?.IATA + 
                  " - " + airports.find(a => a.IATA === departureAirport)?.Name +
                  " (" + airports.find(a => a.IATA === departureAirport)?.Country + ")"
              } : null}
              loadOptions={loadAirportOptions}
              onChange={(selected) => setDepartureAirport(selected ? selected.value : '')}
              isDisabled={isLoading}
              placeholder="Type to search airports..."
            />
          </div>
          <div className="search-parameter arrival-parameter">
            <label style={{ fontWeight: 700 }}>Arrival Airport:</label>
            <AsyncSelect
              className="select-input"
              cacheOptions
              defaultOptions
              value={arrivalAirport ? {
                value: arrivalAirport,
                label: airports.find(a => a.IATA === arrivalAirport)?.IATA + 
                  " - " + airports.find(a => a.IATA === arrivalAirport)?.Name +
                  " (" + airports.find(a => a.IATA === arrivalAirport)?.Country + ")"
              } : null}
              loadOptions={loadAirportOptions}
              onChange={(selected) => setArrivalAirport(selected ? selected.value : '')}
              isDisabled={isLoading}
              placeholder="Type to search airports..."
            />
          </div>
        </div>
        <div className="search-parameter">
          <label>Avoid Countries:</label>
          <AsyncSelect
            isMulti
            className="select-input avoid-countries-select"
            cacheOptions
            defaultOptions
            value={avoidCountries.map(country => ({
              value: country,
              label: country
            }))}
            loadOptions={loadCountryOptions}
            onChange={(selected) => {
              setAvoidCountries(selected ? selected.map(option => option.value) : []);
            }}
            isDisabled={isLoading}
            placeholder="Type to search countries..."
          />
        </div>
        <div className="search-parameter">
          <label>Avoid Airlines:</label>
          <AsyncSelect
            isMulti
            className="select-input avoid-airlines-select"
            cacheOptions
            defaultOptions={airlines}
            value={avoidAirlines.map(airline => ({
              value: airline,
              label: airlines.find(a => a.value === airline)?.label || airline
            }))}
            loadOptions={loadAirlineOptions}
            onChange={(selected) => {
              setAvoidAirlines(selected ? selected.map(option => option.value) : []);
            }}
            isDisabled={isLoading}
            placeholder="Select airlines to avoid..."
          />
        </div>
        <button 
          className="search-button"
          onClick={handleSearch}
          disabled={isLoading || !departureAirport || !arrivalAirport}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>
      <FlightResults 
        results={searchResults} 
        isVisible={showResults}
      />
      
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div className="loading-text">Searching for routes...</div>
        </div>
      )}
    </div>
  );
} 

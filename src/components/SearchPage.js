import React, { useState, useEffect, useMemo } from 'react';
import { FlightResults } from './FlightResults';
import UA_miles from '../data/UA_miles.json'; // United Airlines (UA) 
import SQ_miles from '../data/SQ_miles.json'; // Singapore Airlines (SQ)
import LH_miles from '../data/LH_miles.json'; // Lufthansa (LH)
import LX_miles from '../data/LX_miles.json'; // Swiss International Air Lines (LX) 
import TG_miles from '../data/TG_miles.json'; // Thai Airways (TG)
import BR_miles from '../data/BR_miles.json'; // EVA Air (BR)
import NH_miles from '../data/NH_miles.json'; // All Nippon Airways (NH)
import OS_miles from '../data/OS_miles.json'; // Austrian Airlines (OS)
import OZ_miles from '../data/OZ_miles.json'; // Asiana Airlines (OZ)
import NZ_miles from '../data/NZ_miles.json'; // Air New Zealand (NZ)
import SA_miles from '../data/SA_miles.json'; // South African Airways (SA)
import AI_miles from '../data/AI_miles.json'; // Air India (AI)
import LO_miles from '../data/LO_miles.json'; // LOT Polish Airlines (LO)
import SN_miles from '../data/SN_miles.json'; // Brussels Airlines (SN)
import A3_miles from '../data/A3_miles.json'; // Aegean Airlines (A3)
import TP_miles from '../data/TP_miles.json'; // TAP Air Portugal (TP)  
import MS_miles from '../data/MS_miles.json'; // EgyptAir (MS)
import WY_miles from '../data/WY_miles.json'; // Oman Air (WY)
import GF_miles from '../data/GF_miles.json'; // Gulf Air (GF)
import AC_miles from '../data/AC_miles.json'; // Air Canada (AC)  
import { airports } from '../data/airports';
import { getUniqueCountries } from '../utils/countryUtils';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import { useNavigate, useSearchParams } from 'react-router-dom';

const COTERMINALS = {
  // North America
  'CHI': ['MDW', 'ORD'], // Chicago (Midway, O'Hare)
  'DAL': ['DFW', 'DAL'], // Dallas (Fort Worth, Love Field)
  'HOU': ['IAH', 'HOU'], // Houston (Intercontinental, Hobby)
  'NYC': ['JFK', 'LGA', 'EWR'], // New York (John F. Kennedy, LaGuardia, Newark)
  'SFL': ['FLL', 'MIA', 'PBI'], // Fort Lauderdale (Fort Lauderdale-Hollywood, Miami, Palm Beach)
  'YTO': ['YTZ', 'YHM', 'YYZ'], // Toronto (Billy Bishop, Hamilton, Toronto Pearson)
  'WAS': ['IAD', 'DCA'], // Washington DC (Washington Dulles, Ronald Reagan)
  
  // South America
  'BUE': ['AEP', 'EZE'], // Buenos Aires (Ezeiza, Ministro Pistarini)
  'RIO': ['GIG', 'SDU'], // Rio de Janeiro (Galeão, Santos Dumont)
  'SAO': ['CGH', 'GRU', 'VCP'], // Sao Paulo (Congonhas, Guarulhos, Viracopos)
  
  // Europe
  'IST': ['IST', 'SAW'], // Istanbul (Sabiha Gökçen, Ataturk)
  'LON': ['LCY', 'LGW', 'LHR', 'LTN', 'STN'], // London (London City, Gatwick, Heathrow, Luton, Stansted) 
  'MIL': ['BGY', 'LIN', 'MXP'], // Milan (Bergamo, Linate, Malpensa)
  'MOW': ['DME', 'SVO', 'VNO', 'ZIA'], // Moscow (Domodedovo, Sheremetyevo, Vnukovo, Zhukovsky)
  'PAR': ['CDG', 'ORY'], // Paris (Charles de Gaulle, Orly)
  'STO': ['ARN', 'BMA'], // Stockholm (Arlanda, Bromma)
  
  // Asia
  'BJS': ['PEK', 'PKX'], // Beijing (Capital, Daxing)
  'JKT': ['CGK', 'HLP'], // Jakarta (Soekarno Hatta, Halim Perdanakusuma)
  'OSA': ['ITM', 'KIX', 'UKB'], // Osaka (Itami, Kansai, Kobe)
  'SPK': ['CTS', 'OKD'], // St. Petersburg (Pulkovo, Oktyabrskaya)
  'SEL': ['GMP', 'ICN'], // Seoul (Gimpo, Incheon)
  'SHA': ['SHA', 'PVG'], // Shanghai (Pudong, Hongqiao)
  'TPE': ['TSA', 'TPE'], // Taipei (Songshan, Taoyuan)
  'TYO': ['HND', 'NRT'] // Tokyo (Haneda, Narita)
};

// Helper function to get the co-terminal group for an airport
function getCoTerminalGroup(airport) {
  for (const [group, airports] of Object.entries(COTERMINALS)) {
    if (airports.includes(airport)) {
      return group;
    }
  }
  return null;
}

// Helper function to check if a route uses co-terminals correctly
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

// ===============================
// Hub Airport Exceptions
// ===============================

// Airports exempt from standard layover restrictions
const HUB_EXCEPTIONS = new Set([
  // Star Alliance Hubs
  'ATH', // Aegean (Athens)
  'YYZ', 'YVR', 'YUL', 'YYC', // Air Canada (Toronto, Vancouver, Montreal, Calgary)
  'PEK', 'CTU', 'PVG', // Air China (Beijing, Chengdu, Shanghai)
  'DEL', 'BOM', // Air India (Delhi, Mumbai)
  'AKL', 'WLG', 'CHC', // Air New Zealand (Auckland, Christchurch)
  'HND', 'NRT', 'KIX', // ANA (Tokyo, Osaka, Nagoya)
  'ICN', 'GMP', // Asiana (Incheon, Seoul)
  'VIE', // Austrian (Vienna)
  'BOG', 'MDE', 'UIO', 'GUA', 'SAL', // Avianca (Bogota, Medellin, Quito, Guatemala City, San Salvador)
  'BRU', // Brussels (Brussels)
  'PTY', // Copa (Panama City)
  'ZAG', // Croatia (Zagreb)
  'CAI', // EgyptAir (Cairo)
  'ADD', // Ethiopian (Addis Ababa)
  'TPE', // EVA (Taipei)
  'WAW', // LOT (Warsaw)
  'FRA', 'MUC', // Lufthansa (Frankfurt, Munich)
  'SZX', // Shenzhen Airlines (Shenzhen)
  'SIN', // Singapore Airlines (Singapore)
  'JNB', // South African (Johannesburg)
  'ZRH', 'GVA', // SWISS (Zurich, Geneva)
  'LIS', 'OPO', // TAP (Lisbon, Porto)
  'BKK', // Thai (Bangkok)
  'IST', // Turkish (Istanbul)
  'ORD', 'DEN', 'IAH', 'LAX', 'EWR', 'SFO', 'IAD', // United (Chicago, Denver, Houston, Los Angeles, Newark, San Francisco, Washington DC)
  // Non-Alliance Hubs
  'YVO', 'YUL', // Air Creebec (Montreal)
  'MUC', 'FRA', // Air Dolomiti (Munich, Frankfurt)
  'MRU', // Air Mauritius (Mauritius)
  'BEG', // Air Serbia (Belgrade)
  'VCP', 'CNF', 'REC', // Azul (Sao Paulo, Campinas, Rio de Janeiro)
  'YWG', 'YTH', // Calm Air (Winnipeg, Thompson)  
  'YZF', 'YFB', // Canadian North (Yellowknife, Inuvik)
  'HKG', // Cathay Pacific (Hong Kong)
  'FRA', // Discover (Frankfurt)
  'ZRH', // Edelweiss (Zurich)
  'AUH', // Etihad (Abu Dhabi)
  'DUS', 'CGN', 'HAM', 'STR', // Eurowings (Dusseldorf, Cologne, Hamburg, Stuttgart)
  'GRU', 'GIG', 'BSB', // GOL (Sao Paulo, Rio de Janeiro, Brasilia)
  'BAH', // Gulf Air (Bahrain)
  'PVG', 'SHA', // Juneyao (Shanghai, Shanghai Pudong)
  'ATH', // Olympic (Athens)
  'MCT', // Oman Air (Muscat)
  'YYT', 'YHZ', // PAL Airlines (St. John's, Halifax)
  'AYT', 'ADB', // SunExpress (Antalya, Adana)
  'BNE', 'MEL', 'SYD' // Virgin Australia (Brisbane, Melbourne, Sydney)
]);

// Add this helper function near the top with other helper functions
const isValidZoneProgression = (path) => {
  if (path.length <= 1) return true;
  
  // Get origin, destination, and layover zones
  const originZone = airports.find(a => a.IATA === path[0].Departure_IATA)?.Zone;
  const destZone = airports.find(a => a.IATA === path[path.length - 1].Arrival_IATA)?.Zone;
  const layoverZones = new Set(path.slice(0, -1).map(segment => 
    airports.find(a => a.IATA === segment.Arrival_IATA)?.Zone
  ));

  // Rule 1: If origin and destination are in same zone, no third zone allowed
  if (originZone === destZone) {
    for (const zone of layoverZones) {
      if (zone !== originZone) return false;
    }
    return true;
  }

  // Rule 2: North America <-> Atlantic: no Pacific layovers
  if ((originZone === 'North America' && destZone === 'Atlantic') ||
      (originZone === 'Atlantic' && destZone === 'North America')) {
    if (layoverZones.has('Pacific')) return false;
  }

  // Rule 3: North America <-> South America: no Pacific or Atlantic layovers
  if ((originZone === 'North America' && destZone === 'South America') ||
      (originZone === 'South America' && destZone === 'North America')) {
    if (layoverZones.has('Pacific') || layoverZones.has('Atlantic')) return false;
  }

  return true;
};

// Add this function near the top with other helper functions
const countLayoversPerCountry = (path) => {
  const counts = {};
  
  for (const segment of path) {
    const arrivalAirport = airports.find(a => a.IATA === segment.Arrival_IATA);
    if (!arrivalAirport) continue;
    
    const country = arrivalAirport.Country;
    if (!counts[country]) {
      counts[country] = {
        total: 0,
        hubCount: 0,
        nonHubCount: 0
      };
    }
    
    if (HUB_EXCEPTIONS.has(segment.Arrival_IATA)) {
      counts[country].hubCount++;
    } else {
      counts[country].nonHubCount++;
    }
    counts[country].total = counts[country].hubCount > 0 ? 1 : counts[country].nonHubCount;
  }
  
  return counts;
};

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL params
  const [maxSegments, setMaxSegments] = useState(() => {
    const segments = searchParams.get('maxSegments');
    return segments ? parseInt(segments, 10) : 4;
  });

  const [avoidAirlines, setAvoidAirlines] = useState(() => {
    const airlines = searchParams.get('avoidAirlines');
    return airlines ? airlines.split(',') : [];
  });

  // Update URL when params change
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    
    // Update maxSegments
    if (maxSegments !== 4) {
      newParams.set('maxSegments', maxSegments.toString());
    } else {
      newParams.delete('maxSegments');
    }
    
    // Update avoidAirlines
    if (avoidAirlines.length > 0) {
      newParams.set('avoidAirlines', avoidAirlines.join(','));
    } else {
      newParams.delete('avoidAirlines');
    }
    
    // Update URL without reloading
    navigate(`?${newParams.toString()}`, { replace: true });
  }, [maxSegments, avoidAirlines]);

  // Update handlers
  const handleMaxSegmentsChange = (value) => {
    const newValue = parseInt(value, 10);
    if (!isNaN(newValue) && newValue >= 0 && newValue <= 6) {
      setMaxSegments(newValue);
    }
  };

  const handleAvoidAirlinesChange = (selected) => {
    setAvoidAirlines(selected ? selected.map(option => option.value) : []);
  };

  // State for selected airports and search results
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [avoidCountries, setAvoidCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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
    // Create filtered allRoutes based on avoided airlines
    const allRoutes = [
      ...(avoidAirlines.includes('UA') ? [] : UA_miles),
      ...(avoidAirlines.includes('SQ') ? [] : SQ_miles),
      ...(avoidAirlines.includes('LH') ? [] : LH_miles),
      ...(avoidAirlines.includes('LX') ? [] : LX_miles),
      ...(avoidAirlines.includes('TG') ? [] : TG_miles),
      ...(avoidAirlines.includes('BR') ? [] : BR_miles),
      ...(avoidAirlines.includes('NH') ? [] : NH_miles),
      ...(avoidAirlines.includes('OS') ? [] : OS_miles),
      ...(avoidAirlines.includes('OZ') ? [] : OZ_miles),
      ...(avoidAirlines.includes('NZ') ? [] : NZ_miles),
      ...(avoidAirlines.includes('SA') ? [] : SA_miles),
      ...(avoidAirlines.includes('AI') ? [] : AI_miles),
      ...(avoidAirlines.includes('LO') ? [] : LO_miles),
      ...(avoidAirlines.includes('SN') ? [] : SN_miles),
      ...(avoidAirlines.includes('A3') ? [] : A3_miles),
      ...(avoidAirlines.includes('TP') ? [] : TP_miles),
      ...(avoidAirlines.includes('MS') ? [] : MS_miles),
      ...(avoidAirlines.includes('WY') ? [] : WY_miles),
      ...(avoidAirlines.includes('GF') ? [] : GF_miles),
      ...(avoidAirlines.includes('AC') ? [] : AC_miles)
    ];

    const routes = [];

    // Get origin and destination airport details for US/Canada check
    const originAirport = airports.find(a => a.IATA === origin);
    const destAirport = airports.find(a => a.IATA === destination);
    const isOriginNorthAmerica = ['United States', 'Canada'].includes(originAirport?.Country);
    const isDestNorthAmerica = ['United States', 'Canada'].includes(destAirport?.Country);
    const bothInNorthAmerica = isOriginNorthAmerica && isDestNorthAmerica;

    // Count existing North American layovers, treating non-hubs and hubs separately
    const northAmericaLayovers = path.reduce((count, segment) => {
      const layoverAirport = airports.find(a => a.IATA === segment.Arrival_IATA);
      if (!layoverAirport || !['United States', 'Canada'].includes(layoverAirport.Country)) {
        return count;
      }
      
      if (HUB_EXCEPTIONS.has(segment.Arrival_IATA)) {
        return { ...count, hubCount: 1 };  // All hubs count as 1 total
      }
      return { ...count, nonHubCount: count.nonHubCount + 1 };  // Each non-hub counts as 1
    }, { nonHubCount: 0, hubCount: 0 });

    // Count existing European layovers in the current path
    const europeanLayovers = path.reduce((count, segment) => {
      const layoverAirport = airports.find(a => a.IATA === segment.Arrival_IATA);
      if (!layoverAirport || !EUROPEAN_COUNTRIES.has(layoverAirport.Country)) {
        return count;
      }
      
      // If it's a hub airport, we've already counted hubs, don't increment
      if (HUB_EXCEPTIONS.has(segment.Arrival_IATA)) {
        return count + (count.hasHub ? 0 : 1);  // Only count hubs once total
      }
      
      // Non-hub European airports count as 1 each
      return count + 1;
    }, { total: 0, hasHub: false });

    // Calculate direct distance if not provided
    if (directDistance === null) {
      directDistance = calculateDirectDistance(origin, destination);
      if (!directDistance) return [];
    }

    // Base case: if we've found a path to the destination
    if (path.length > 0 && path[path.length - 1].Arrival_IATA === destination) {
      const totalDistance = path.reduce((sum, segment) => sum + segment.Distance, 0);
      const multiplier = 2 + (path.length - 1) * 0.2; // 2.0x for 1 stop, 2.2x for 2 stops, etc.
      if (totalDistance <= directDistance * multiplier) {
        return [path];
      }
      return [];
    }

    // Don't allow paths longer than maxSegments
    if (path.length >= maxSegments) {
      return [];
    }

    // Get current point and its country
    const currentPoint = path.length === 0 ? origin : path[path.length - 1].Arrival_IATA;
    const currentAirport = airports.find(a => a.IATA === currentPoint);
    
    if (!currentAirport) return [];

    // Add helper function to count layovers by country
    const getLayoverCountByCountry = (currentPath) => {
      const countByCountry = {};
      currentPath.forEach(segment => {
        const airport = airports.find(a => a.IATA === segment.Arrival_IATA);
        if (!airport) return;
        
        const country = airport.Country;
        if (!countByCountry[country]) {
          countByCountry[country] = { nonHubCount: 0, hasHub: false };
        }
        
        if (HUB_EXCEPTIONS.has(segment.Arrival_IATA)) {
          countByCountry[country].hasHub = true;
        } else {
          countByCountry[country].nonHubCount += 1;
        }
      });
      return countByCountry;
    };

    const possibleSegments = allRoutes.filter(route => {
      if (route["Departure IATA"] !== currentPoint) return false;

      // Get origin and destination countries
      const originAirport = airports.find(a => a.IATA === origin);
      const destAirport = airports.find(a => a.IATA === destination);
      const thisArrivalAirport = airports.find(a => a.IATA === route["Arrival IATA"]);
      
      if (!originAirport || !destAirport || !thisArrivalAirport) return false;

      // Check for multiple layovers in same country
      const countryLayovers = getLayoverCountByCountry(path);
      const nextCountry = thisArrivalAirport.Country;
      
      // Allow multiple stops only if it's origin or destination country
      if (nextCountry !== originAirport.Country && 
          nextCountry !== destAirport.Country && 
          countryLayovers[nextCountry] >= 1 &&
          !HUB_EXCEPTIONS.has(route["Arrival IATA"])) {
        return false;
      }

      // Get zones
      const originZone = airports.find(a => a.IATA === origin)?.Zone;
      const destZone = airports.find(a => a.IATA === destination)?.Zone;
      const connectZone = thisArrivalAirport?.Zone;

      // Allow progressive zone changes
      const validZoneProgression = (path) => {
        for (let i = 1; i < path.length - 1; i++) {
          const prevZone = airports.find(a => a.IATA === path[i-1]["Departure IATA"]).Zone;
          const currentZone = airports.find(a => a.IATA === path[i]["Departure IATA"]).Zone;
          const nextZone = airports.find(a => a.IATA === path[i+1]["Departure IATA"]).Zone;
          
          // Allow staying in same zone or moving forward
          if (currentZone !== prevZone && currentZone !== nextZone) {
            // Only allow backtracking through hubs
            if (!HUB_EXCEPTIONS.has(path[i]["Departure IATA"])) {
              return false;
            }
          }
        }
        return true;
      };

      // Rule: When flying between two zones, cannot connect via a third zone
      // Example: North America to Atlantic cannot connect via Pacific
      if (!isValidZoneProgression(path, route)) {
        return false;
      }

      // Add co-terminal validation
      if (!isValidCoTerminalRoute(route, path)) {
        return false;
      }
      
      // Get the arrival airport details
      const arrivalAirport = airports.find(a => a.IATA === route["Arrival IATA"]);
      if (!arrivalAirport) return false;

      // Check if adding this segment would exceed US/Canada layover limit
      const isArrivalNorthAmerica = ['United States', 'Canada'].includes(arrivalAirport.Country);
      if (isArrivalNorthAmerica && !bothInNorthAmerica) {
        let nextNonHubCount = northAmericaLayovers.nonHubCount;
        let nextHubCount = northAmericaLayovers.hubCount;

        if (HUB_EXCEPTIONS.has(route["Arrival IATA"])) {
          nextHubCount = 1;
        } else {
          nextNonHubCount += 1;
        }

        // Total layovers = non-hub count + hub count (all hubs count as 1)
        if (nextNonHubCount + nextHubCount > 2) {
          return false;
        }
      }

      // Check if adding this segment would exceed European layover limit
      const isEuropeanArrival = EUROPEAN_COUNTRIES.has(arrivalAirport.Country);
      const isEuropeanHub = HUB_EXCEPTIONS.has(route["Arrival IATA"]);
      
      if (isEuropeanArrival) {
        let newLayoverCount = europeanLayovers;
        if (isEuropeanHub && !europeanLayovers.hasHub) {
          newLayoverCount += 1;  // First hub encounter counts as 1
        } else if (!isEuropeanHub) {
          newLayoverCount += 1;  // Non-hub counts as 1
        }
        if (newLayoverCount > 2) {
          return false;
        }
      }

      // Check if we're not backtracking to a visited airport
      if (visited.has(route["Arrival IATA"])) return false;

      // Check if we're not backtracking to a visited country
      // Exception: Allow same country connection if it's a direct continuation
      const isBacktrackingCountry = visitedCountries.has(arrivalAirport.Country) &&
                                  arrivalAirport.Country !== currentAirport.Country;
      if (isBacktrackingCountry) return false;

      // Rule: Maximum 1 layover per transit country (with hub exceptions)
      const layoverCounts = getLayoverCountByCountry(path);
      const arrivalCountry = arrivalAirport.Country;
      if (arrivalCountry !== originAirport.Country && 
          arrivalCountry !== destAirport.Country && 
          layoverCounts[arrivalCountry] >= 1 &&
          !HUB_EXCEPTIONS.has(route["Arrival IATA"])) { // Add exception check
        return false;
      }

      // Rule: Maximum 2 stops in Europe (with hub exceptions)
      if (isEuropeanArrival && 
          europeanLayovers >= 2 &&
          !HUB_EXCEPTIONS.has(route["Arrival IATA"])) { // Add exception check
        return false;
      }

      // Check if adding this stop would exceed country limit
      if (nextCountry !== originAirport.Country && nextCountry !== destAirport.Country) {
        const currentCount = countryLayovers[nextCountry] || { nonHubCount: 0, hasHub: false };
        
        // For non-hub airports, count individually
        if (!HUB_EXCEPTIONS.has(route["Arrival IATA"])) {
          // If there's already a hub or non-hub stop in this country, reject
          if (currentCount.hasHub || currentCount.nonHubCount > 0) {
            return false;
          }
          // Count this non-hub stop
          currentCount.nonHubCount = 1;
        }
        // For hub airports
        else {
          // If there's already a non-hub stop in this country, reject
          if (currentCount.nonHubCount > 0) {
            return false;
          }
          // Mark that we have a hub stop
          currentCount.hasHub = true;
        }
      }

      // Add country layover check
      if (arrivalAirport.Country !== originAirport.Country && 
          arrivalAirport.Country !== destAirport.Country) {
        const layoverCounts = countLayoversPerCountry(path);
        const countryCount = layoverCounts[arrivalAirport.Country]?.total || 0;
        
        // If we already have a stop in this country, only allow if both are hubs
        if (countryCount > 0) {
          // If this is not a hub airport, reject
          if (!HUB_EXCEPTIONS.has(route["Arrival IATA"])) {
            return false;
          }
          // If we already have a non-hub stop in this country, reject
          if (layoverCounts[arrivalAirport.Country]?.nonHubCount > 0) {
            return false;
          }
        }
      }

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

  // Update URL when form changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (departureAirport) params.set('from', departureAirport);
    if (arrivalAirport) params.set('to', arrivalAirport);
    if (avoidCountries.length > 0) params.set('avoid', avoidCountries.join(','));
    if (maxSegments !== 4) params.set('max', maxSegments.toString()); // Only add if not default
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [departureAirport, arrivalAirport, avoidCountries, maxSegments]);

  // Read URL params on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const originParam = params.get('from');
    const destParam = params.get('to');
    const avoidParam = params.get('avoid');
    const maxParam = params.get('max');

    if (originParam) setDepartureAirport(originParam);
    if (destParam) setArrivalAirport(destParam);
    if (avoidParam) setAvoidCountries(avoidParam.split(','));
    if (maxParam) {
      const maxValue = parseInt(maxParam, 10);
      if (!isNaN(maxValue) && maxValue >= 0 && maxValue <= 6) {
        setMaxSegments(maxValue);
      }
    }
  }, []);

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
              placeholder="Select airports..."
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
              placeholder="Select airports..."
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
            placeholder="Select countries..."
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
            onChange={handleAvoidAirlinesChange}
            isDisabled={isLoading}
            placeholder="Select airlines..."
          />
        </div>
        <div className="search-parameter max-segments-parameter">
          <label>Maximum Segments</label>
          <input
            type="number"
            min="1"
            max="6"
            value={maxSegments}
            onChange={(e) => handleMaxSegmentsChange(e.target.value)}
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

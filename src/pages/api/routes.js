import { airports } from '../../data/airports';
import UA_miles from '../../data/UA_miles.json';
import SQ_miles from '../../data/SQ_miles.json';
import LH_miles from '../../data/LH_miles.json';
import LX_miles from '../../data/LX_miles.json';
import TG_miles from '../../data/TG_miles.json';
import BR_miles from '../../data/BR_miles.json';
import NH_miles from '../../data/NH_miles.json';
import OS_miles from '../../data/OS_miles.json';
import OZ_miles from '../../data/OZ_miles.json';
import NZ_miles from '../../data/NZ_miles.json';   
import SA_miles from '../../data/SA_miles.json';
import AI_miles from '../../data/AI_miles.json';
import LO_miles from '../../data/LO_miles.json';
import SN_miles from '../../data/SN_miles.json'; 
import A3_miles from '../../data/A3_miles.json';
import TP_miles from '../../data/TP_miles.json';
import MS_miles from '../../data/MS_miles.json';
import WY_miles from '../../data/WY_miles.json';
import GF_miles from '../../data/GF_miles.json';
import AC_miles from '../../data/AC_miles.json';

// Constants
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

const EUROPEAN_COUNTRIES = new Set([
  'Germany', 'United Kingdom', 'France', 'Italy', 'Spain', 'Poland', 'Ukraine', 
  'Romania', 'Netherlands', 'Belgium', 'Czechia', 'Sweden', 'Portugal', 'Greece',
  'Hungary', 'Austria', 'Belarus', 'Switzerland', 'Bulgaria', 'Serbia', 'Denmark',
  'Finland', 'Norway', 'Slovakia', 'Ireland', 'Croatia', 'Bosnia And Herzegovina',
  'Moldova', 'Lithuania', 'Albania', 'Slovenia', 'Latvia', 'North Macedonia',
  'Estonia', 'Luxembourg', 'Montenegro', 'Malta', 'Iceland'
]);

// Helper Functions
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
  return Math.round(R * c);
}

function findPossibleRoutes(origin, destination, visited = new Set(), visitedCountries = new Set(), path = [], directDistance = null) {
  const allRoutes = [...UA_miles, ...SQ_miles, ...LH_miles, ...LX_miles, ...TG_miles, 
                     ...BR_miles, ...NH_miles, ...OS_miles, ...OZ_miles, ...NZ_miles, 
                     ...SA_miles, ...AI_miles, ...LO_miles, ...SN_miles, ...A3_miles, 
                     ...TP_miles, ...MS_miles, ...WY_miles, ...GF_miles, ...AC_miles];
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

  if (directDistance === null) {
    directDistance = calculateDirectDistance(origin, destination);
    if (!directDistance) return [];
  }

  if (path.length > 0 && path[path.length - 1].Arrival_IATA === destination) {
    const totalDistance = path.reduce((sum, segment) => sum + segment.Distance, 0);
    if (totalDistance <= directDistance * 2) {
      return [path];
    }
    return [];
  }

  if (path.length >= 4) {
    return [];
  }

  const currentPoint = path.length === 0 ? origin : path[path.length - 1].Arrival_IATA;
  const currentAirport = airports.find(a => a.IATA === currentPoint);
  
  if (!currentAirport) return [];

  const possibleSegments = allRoutes.filter(route => {
    if (route["Departure IATA"] !== currentPoint) return false;
    
    if (!isValidCoTerminalRoute(route, path)) {
      return false;
    }
    
    const arrivalAirport = airports.find(a => a.IATA === route["Arrival IATA"]);
    if (!arrivalAirport) return false;

    const isArrivalNorthAmerica = ['United States', 'Canada'].includes(arrivalAirport.Country);
    if (isArrivalNorthAmerica && !bothInNorthAmerica && northAmericaLayovers >= 2) {
      return false;
    }

    const isEuropeanArrival = EUROPEAN_COUNTRIES.has(arrivalAirport.Country);
    if (isEuropeanArrival && europeanLayovers >= 2) {
      return false;
    }

    if (visited.has(route["Arrival IATA"])) return false;
    const isBacktrackingCountry = visitedCountries.has(arrivalAirport.Country) &&
                                arrivalAirport.Country !== currentAirport.Country;
    if (isBacktrackingCountry) return false;

    return true;
  });

  for (const segment of possibleSegments) {
    const arrivalAirport = airports.find(a => a.IATA === segment["Arrival IATA"]);
    
    const currentTotalDistance = path.reduce((sum, seg) => sum + seg.Distance, 0) + 
                             segment["Flight Distance (miles)"];
    
    if (currentTotalDistance > directDistance * 2) {
      continue;
    }

    const newVisited = new Set(visited);
    newVisited.add(segment["Arrival IATA"]);
    
    const newVisitedCountries = new Set(visitedCountries);
    newVisitedCountries.add(arrivalAirport.Country);

    const newPath = [...path, {
      Departure_IATA: segment["Departure IATA"],
      Arrival_IATA: segment["Arrival IATA"],
      Distance: segment["Flight Distance (miles)"]
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
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'Missing origin or destination' });
  }

  try {
    const originAirport = airports.find(a => a.IATA === from);
    const visited = new Set([from]);
    const visitedCountries = new Set([originAirport.Country]);
    
    const routes = findPossibleRoutes(from, to, visited, visitedCountries);
    
    return res.status(200).json({ routes });
  } catch (error) {
    console.error('Route finding error:', error);
    return res.status(500).json({ error: 'Error finding routes' });
  }
} 
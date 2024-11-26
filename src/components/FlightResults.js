import React, { useState } from 'react';
import './FlightResults.css';
import { airports } from '../data/airports';
import pricingChart from '../data/formatted_partner_airlines_pricing_chart.json';
import { FaSort, FaSortUp, FaSortDown, FaSearch, FaTimes } from 'react-icons/fa';

// Helper Functions
// Calculates the direct "as the crow flies" distance between two airports using the Haversine formula
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

// Looks up the award pricing based on regions and distance from the pricing chart
function calculatePrice(fromRegion, toRegion, totalDistance) {
  const pricingRule = pricingChart.find(rule => 
    rule['From Region'] === fromRegion &&
    rule['To Region'] === toRegion &&
    totalDistance >= rule['Min Distance'] &&
    totalDistance <= rule['Max Distance']
  );

  if (!pricingRule) return null;

  return {
    economy: pricingRule.Economy,
    premium: pricingRule['Premium Economy'],
    business: pricingRule.Business,
    first: pricingRule.First
  };
}

// Formats mile amounts with thousands separators
function formatPrice(miles) {
  if (!miles) return '-';
  return miles.toLocaleString();
}

// Formats the percentage difference from direct distance, showing "Direct" for non-stop flights
function formatPercentageDiff(percentageDiff, isDirect) {
  if (isDirect) return 'Direct';
  if (percentageDiff < 1) {
    return `+${percentageDiff.toFixed(2)}%`;
  }
  return `+${Math.round(percentageDiff)}%`;
}

// Removes duplicate routes by creating a unique key for each route combination
function removeDuplicateRoutes(routes) {
  const seen = new Set();
  
  return routes.filter(route => {
    // Create a unique key for this route
    const routeKey = route.map(segment => 
      `${segment.Departure_IATA}-${segment.Arrival_IATA}-${segment.Distance}`
    ).join('|');
    
    // If we've seen this route before, filter it out
    if (seen.has(routeKey)) {
      return false;
    }
    
    // Otherwise, add it to seen routes and keep it
    seen.add(routeKey);
    return true;
  });
}

// Main Component
export function FlightResults({ results, isVisible }) {
  // State for pagination, sorting and search filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const resultsPerPage = 25;

  if (!isVisible || !results || results.length === 0) return null;

  // Remove duplicates before any other processing
  const uniqueResults = removeDuplicateRoutes(results);

  // Calculate direct distance
  const directDistance = calculateDirectDistance(
    uniqueResults[0][0].Departure_IATA,
    uniqueResults[0][uniqueResults[0].length - 1].Arrival_IATA
  );

  // Helper function to sort results based on different criteria (stops, distance, cabin class prices)
  const getSortedResults = (results) => {
    const sortedResults = [...results];
    
    if (sortConfig.key) {
      sortedResults.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortConfig.key) {
          case 'stops':
            aValue = a.length - 1;
            bValue = b.length - 1;
            break;
          case 'distance':
            aValue = a.reduce((sum, segment) => sum + segment.Distance, 0);
            bValue = b.reduce((sum, segment) => sum + segment.Distance, 0);
            break;
          case 'economy':
          case 'premium':
          case 'business':
          case 'first':
            const originAirportA = airports.find(airport => airport.IATA === a[0].Departure_IATA);
            const destAirportA = airports.find(airport => airport.IATA === a[a.length - 1].Arrival_IATA);
            const totalDistanceA = a.reduce((sum, segment) => sum + segment.Distance, 0);
            const pricingA = calculatePrice(originAirportA.Zone, destAirportA.Zone, totalDistanceA);
            
            const originAirportB = airports.find(airport => airport.IATA === b[0].Departure_IATA);
            const destAirportB = airports.find(airport => airport.IATA === b[b.length - 1].Arrival_IATA);
            const totalDistanceB = b.reduce((sum, segment) => sum + segment.Distance, 0);
            const pricingB = calculatePrice(originAirportB.Zone, destAirportB.Zone, totalDistanceB);
            
            aValue = pricingA?.[sortConfig.key] || 0;
            bValue = pricingB?.[sortConfig.key] || 0;
            break;
          case 'departure':
            aValue = a[0].Departure_IATA;
            bValue = b[0].Departure_IATA;
            break;
          case 'arrival':
            aValue = a[a.length - 1].Arrival_IATA;
            bValue = b[b.length - 1].Arrival_IATA;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sortedResults;
  };

  // Filters results based on search terms matching airport codes
  const filterResults = (results) => {
    if (!searchTerm) return results;
    
    const searchTerms = searchTerm.toUpperCase().trim().split(/\s+/);
    
    return results.filter(itinerary => {
      // Extract all airports in the route
      const routeAirports = [
        ...new Set([
          itinerary[0].Departure_IATA,
          ...itinerary.map(segment => segment.Arrival_IATA)
        ])
      ];
      
      // Check if all search terms exist in the route airports (any order)
      return searchTerms.every(term => 
        routeAirports.some(airport => airport.includes(term))
      );
    });
  };

  // Apply filtering to unique results
  const filteredResults = filterResults(uniqueResults);
  const sortedResults = getSortedResults(filteredResults);
  const totalPages = Math.ceil(sortedResults.length / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const paginatedResults = sortedResults.slice(startIndex, endIndex);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="sort-icon" />;
    return sortConfig.direction === 'asc' ? 
      <FaSortUp className="sort-icon active" /> : 
      <FaSortDown className="sort-icon active" />;
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Renders pagination controls with ellipsis for large page counts
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="pagination">
        <button 
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          className="pagination-first"
        >
          First
        </button>
        <button 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        
        <div className="page-numbers">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(pageNum => 
              pageNum === 1 || 
              pageNum === totalPages || 
              Math.abs(pageNum - currentPage) <= 1
            )
            .map((pageNum, idx, arr) => (
              <React.Fragment key={pageNum}>
                {idx > 0 && arr[idx - 1] !== pageNum - 1 && <span>...</span>}
                <button
                  className={pageNum === currentPage ? 'active' : ''}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              </React.Fragment>
            ))}
        </div>

        <button 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
        <button 
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
          className="pagination-last"
        >
          Last
        </button>
      </div>
    );
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <div className="header-left">
          <div className="direct-distance">
            Direct Distance: {directDistance.toLocaleString()} miles
          </div>
          <div className="results-count">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedResults.length)} of {sortedResults.length} routes
          </div>
        </div>
        <div className="search-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search airports..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
      </div>

      <table className="flight-results">
        <thead>
          <tr>
            <th className="sortable" onClick={() => handleSort('departure')}>
              From <FaSort className="sort-icon" />
            </th>
            <th className="sortable" onClick={() => handleSort('arrival')}>
              To <FaSort className="sort-icon" />
            </th>
            <th className="sortable" onClick={() => handleSort('stops')}>
              Stops <FaSort className="sort-icon" />
            </th>
            <th>Layovers</th>
            <th className="sortable" onClick={() => handleSort('distance')}>
              Distance <FaSort className="sort-icon" />
            </th>
            <th className="sortable" onClick={() => handleSort('economy')}>
              Economy <FaSort className="sort-icon" />
            </th>
            <th className="sortable" onClick={() => handleSort('business')}>
              Business <FaSort className="sort-icon" />
            </th>
            <th className="sortable" onClick={() => handleSort('first')}>
              First <FaSort className="sort-icon" />
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedResults.map((itinerary, index) => {
            const numStops = itinerary.length - 1;
            const layovers = itinerary
              .slice(0, -1)
              .map((segment) => segment.Arrival_IATA)
              .join(' → ');
            
            const totalDistance = itinerary.reduce((sum, segment) => sum + segment.Distance, 0);
            const isDirect = itinerary.length === 1;
            const percentageDiff = directDistance 
              ? ((totalDistance / directDistance) - 1) * 100 
              : null;

            const formattedDiff = percentageDiff !== null 
              ? formatPercentageDiff(percentageDiff, isDirect)
              : '-';

            const originAirport = airports.find(a => a.IATA === itinerary[0].Departure_IATA);
            const destAirport = airports.find(a => a.IATA === itinerary[itinerary.length - 1].Arrival_IATA);
            
            const pricing = calculatePrice(
              originAirport.Zone,
              destAirport.Zone,
              totalDistance
            );

            return (
              <tr key={startIndex + index} className={isDirect ? 'direct-route' : ''}>
                <td>{itinerary[0].Departure_IATA}</td>
                <td>{itinerary[itinerary.length - 1].Arrival_IATA}</td>
                <td>{numStops}</td>
                <td className="layovers">{layovers || '-'}</td>
                <td>{formattedDiff}</td>
                <td className="price-column">{formatPrice(pricing?.economy)}</td>
                <td className="price-column">{formatPrice(pricing?.business)}</td>
                <td className="price-column">{formatPrice(pricing?.first)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {renderPagination()}
    </div>
  );
} 
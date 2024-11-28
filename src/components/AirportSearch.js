import React, { useState } from 'react';
import { airports } from '../data/airports';

export function AirportSearch({ label, value, onChange }) {
  // State for search suggestions and input field
  const [suggestions, setSuggestions] = useState([]);
  const [inputValue, setInputValue] = useState('');

  // Handles input changes and filters airport suggestions
  // Prioritizes IATA code matches over airport name matches
  // Limited to 5 suggestions maximum
  const handleInputChange = (e) => {
    const input = e.target.value;
    setInputValue(input);
    
    if (input.length > 1) {
      // First find IATA matches
      const iataMatches = airports.filter(airport => 
        airport.IATA.toLowerCase().includes(input.toLowerCase())
      );
      
      // Then find name matches, excluding airports already matched by IATA
      const nameMatches = airports.filter(airport => 
        !iataMatches.includes(airport) && 
        airport.Name.toLowerCase().includes(input.toLowerCase())
      );
      
      // Combine the results, IATA matches first
      const filtered = [...iataMatches, ...nameMatches].slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  return (
    <div className="airport-search">
      <label>{label}</label>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={`Enter ${label} airport`}
      />
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map(airport => (
            <li 
              key={airport.IATA}
              onClick={() => {
                onChange(airport.IATA);
                setInputValue(airport.IATA);
                setSuggestions([]);
              }}
            >
              {airport.IATA} - {airport.Name} ({airport.Country})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 
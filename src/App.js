import React from 'react';
import { SearchPage } from './components/SearchPage';
import { AirportSearch } from './components/AirportSearch';
import './App.css';
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <SearchPage />
      </div>
    </BrowserRouter>
  );
}

export default App;

import React, { useState } from 'react';
import { getMoviesByCountry } from '../services/api';

function MovieFilter() {
  const [country, setCountry] = useState('US');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [movies, setMovies] = useState([]);

  const handleFetch = async () => {
    // Convert ["1", "3"] to "1,3"
    const releaseTypeString = selectedTypes.join(',');
    const data = await getMoviesByCountry(country, releaseTypeString);
    setMovies(data);
  };

  // ...handle country input, multi-select for release types, etc.

  return (
    <div>
      {/* ...country input, multi-select or checkboxes... */}
      <button onClick={handleFetch}>Fetch Movies</button>
      {/* Render {movies} here */}
    </div>
  );
}

export default MovieFilter;
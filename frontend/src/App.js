import React, { useState } from 'react';
import {
  Container,
  Typography,
  Button,
  TextField,
  Box,
  FormControlLabel,
  Checkbox,
  MenuItem 
} from '@mui/material';
import { getMoviesByCountry } from './services/api';
//import { RELEASE_TYPES } from './utils/releaseTypes';
import MovieTable from './components/MovieTable';
import { COUNTRY_OPTIONS } from './utils/countries'; // Dynamically generated list from world-countries
import Autocomplete from '@mui/material/Autocomplete';


export default function App() {
  const [country, setCountry] = useState(COUNTRY_OPTIONS.find((c) => c.code === 'IE')); // Default: Ireland
  const [movies, setMovies] = useState([]);
  const [selectedMovieIds, setSelectedMovieIds] = useState([]);
  const [selectedReleaseTypes, setSelectedReleaseTypes] = useState([3]); // Default: Theatrical only
  const [selectedYear, setSelectedYear] = useState(2025); // Default to 2025

  const handleToggleReleaseType = (typeId) => {
    setSelectedReleaseTypes((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  };

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
  };
  
  const handleFetchMovies = async () => {
    if (!country || !country.code) {
      alert('Please select a valid country.');
      return;
    }
  
    setMovies([]);
    setSelectedMovieIds([]);
  
    try {
      const releaseTypeString = selectedReleaseTypes.join(',');
      const result = await getMoviesByCountry(country.code, releaseTypeString, selectedYear);
      const fetchedMovies = result.data || [];
      const allIds = fetchedMovies.map((m) => m.movie_id);
  
      setMovies(fetchedMovies);
      setSelectedMovieIds(allIds);
    } catch (error) {
      console.error('Error fetching movies:', error);
    }
  };

  const handleGenerateIcs = async () => {
    if (selectedMovieIds.length === 0) {
      alert('Please select at least one movie to generate an ICS file.');
      return;
    }
    console.log('Selected Movie IDs:', selectedMovieIds); // Debug selected IDs


    // Get the unique selected movie IDs
    const uniqueMovieIds = [...new Set(selectedMovieIds)];
  
    // Get the selected country, year, and release types
    const countryCode = country.code;
    const year = selectedYear;
    const releaseTypes = selectedReleaseTypes.join(',');
  
    try {
      const response = await fetch(`http://127.0.0.1:5000/movies/ics/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movie_ids: uniqueMovieIds,
          country_code: countryCode,
          year: year,
          release_types: releaseTypes,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to generate ICS');
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'movies_calendar.ics');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error generating ICS:', error);
    }
  };

  const handleSelectAll = () => {
    setSelectedMovieIds(movies.map((movie) => movie.movie_id));
  };

  const handleDeselectAll = () => {
    setSelectedMovieIds([]);
  };

  return (
    
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Typography variant="h4" gutterBottom>
        Cinema to Calendar
      </Typography>

      {/* Country and Year Input in the same row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        {/* Country Input with Autocomplete */}
        <Autocomplete
          options={COUNTRY_OPTIONS}
          getOptionLabel={(option) => option.name}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <img
                src={option.flagUrl}
                alt={option.code}
                style={{ width: 20, marginRight: 8 }}
              />
              {option.name}
            </Box>
          )}
          value={country}
          onChange={(event, newValue) => setCountry(newValue || country)}
          renderInput={(params) => (
            <TextField {...params} label="Select Country" variant="outlined" />
          )}
          isOptionEqualToValue={(option, value) => option.code === value.code}
          sx={{ width: 300 }} // Adjust dropdown width for country
        />

        {/* Year Input with Select */}
        <TextField
          select
          label="Select Year"
          value={selectedYear}
          onChange={handleYearChange}
          variant="outlined"
          sx={{ width: 150 }} // Adjust dropdown width for year
        >
          {[2024, 2025, 2026, 2027].map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="contained" onClick={handleFetchMovies}>
          Fetch Movies
        </Button>
      </Box>

      {/* Release Type Options */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="subtitle1">Include:</Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={selectedReleaseTypes.includes(1)}
              onChange={() => handleToggleReleaseType(1)}
              size="small"
            />
          }
          label="Premiere"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={selectedReleaseTypes.includes(4)}
              onChange={() => handleToggleReleaseType(4)}
              size="small"
            />
          }
          label="Digital"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={selectedReleaseTypes.includes(5)}
              onChange={() => handleToggleReleaseType(5)}
              size="small"
            />
          }
          label="Physical"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={selectedReleaseTypes.includes(6)}
              onChange={() => handleToggleReleaseType(6)}
              size="small"
            />
          }
          label="TV"
        />
      </Box>

      
      {/* Movie Table (assuming MovieTable component exists and displays movies) */}
      {movies.length > 0 && (
        <Box sx={{ mb: 2 }}>
            <Button variant="text" size="small" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="text" size="small" onClick={handleDeselectAll}>
              Deselect All
            </Button>
          <MovieTable
            movies={movies}
            selectedMovieIds={selectedMovieIds}
            onToggleSelect={(id) =>
              setSelectedMovieIds((prev) =>
                prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id]
              )
            }
          />
        </Box>
      )}

      {/* Generate ICS Button */}
      {movies.length > 0 && (
        <Box   sx={{
          position: 'sticky',
          bottom: 0,
          backgroundColor: 'white',
          borderTop: '1px solid #ccc',
          padding: 2,
          zIndex: 1000,
        }}
      >
        <Typography variant="subtitle2">
          {selectedMovieIds.length} movies selected.
        </Typography>
        <Button variant="contained" color="success" onClick={handleGenerateIcs}>
          Generate Calendar (.ics)
        </Button>
        </Box>
        
      )}
            <Box
        sx={{
          mt: 4,
          pt: 2,
          borderTop: '1px solid #ccc',
          textAlign: 'center',
          fontSize: '0.9rem',
        }}
      >
        <Typography variant="body2" gutterBottom>
        This application uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.
        </Typography>
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <img
            src={`${process.env.PUBLIC_URL}/tmdb-logo.svg`}
            alt="TMDB Logo"
            style={{ maxWidth: '150px', marginTop: '10px' }}
          />
        </a>
      </Box>
    </Container>
  );
}

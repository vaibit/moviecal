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
import MovieTable from './components/MovieTable';
import { COUNTRY_OPTIONS } from './utils/countries';
import Autocomplete from '@mui/material/Autocomplete';
import { saveAs } from 'file-saver'; // To save the ICS file

const apiUrl = process.env.REACT_APP_API_URL;

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

  // Function to generate ICS content for all selected movies
  const generateIcsContent = () => {
    const selectedMovies = movies.filter(movie => selectedMovieIds.includes(movie.movie_id));
  
    let icsFile = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Add to Calendar//NONSGML v1.0//EN\n`;
  
    // Adding timezone information (UTC timezone as an example)
    icsFile += `BEGIN:VTIMEZONE\nTZID:UTC\nBEGIN:STANDARD\nDTSTART:19710101T000000\nTZOFFSETFROM:+0000\nTZOFFSETTO:+0000\nEND:STANDARD\nEND:VTIMEZONE\n`;
  
    selectedMovies.forEach(movie => {
      const startDate = movie.release_date;  // Assuming release_date is in 'YYYY-MM-DD' format
      const endDate = movie.release_date;    // End date same as start date for one-hour event
  
      // Generate a unique ID for each event (UUID format)
      const uid = `movie-${startDate.replace(/-/g, '')}-${Math.floor(Math.random() * 1000000)}`;
  
      // Generate current timestamp for DTSTAMP (in UTC format)
      const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];  // Current timestamp
  
      // Create the TMDb link
      const tmdbLink = `https://www.themoviedb.org/movie/${movie.tmdb_id}`;
  
      // Event Details: Set to 12:00 PM start time, 1 hour duration
      icsFile += `BEGIN:VEVENT\nSUMMARY:${movie.title}\nDESCRIPTION:${movie.description} More info: ${tmdbLink}\n`;
  
      // Add DTSTAMP and UID for each event
      icsFile += `DTSTAMP:${dtStamp}\n`;
      icsFile += `UID:${uid}\n`;
  
      // Set the event to start at 12:00 PM on the release date and end at 1:00 PM
      icsFile += `DTSTART;TZID=UTC:${startDate.replace(/-/g, '')}T120000\n`;  // Start at 12:00 PM
      icsFile += `DTEND;TZID=UTC:${endDate.replace(/-/g, '')}T130000\n`;    // End at 1:00 PM
  
      // No LOCATION, no alarms (notifications)
      icsFile += `END:VEVENT\n`;
    });
  
    icsFile += `END:VCALENDAR`;
  
    return icsFile;
  };
  
  
  const handleGenerateIcs = () => {
    const icsContent = generateIcsContent();
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    saveAs(blob, 'movies_calendar.ics');
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

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
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
          sx={{ width: 300 }}
        />

        <TextField
          select
          label="Select Year"
          value={selectedYear}
          onChange={(event) => setSelectedYear(event.target.value)}
          variant="outlined"
          sx={{ width: 150 }}
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
      </Box>
      
      {/* Movie Table */}
      {movies.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <MovieTable
            movies={movies}
            selectedMovieIds={selectedMovieIds}
            onToggleSelect={(id) => setSelectedMovieIds((prev) =>
              prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id]
            )}
          />
        </Box>
      )}

      {/* Generate ICS Button */}
      {movies.length > 0 && (
        <Box sx={{
          position: 'sticky',
          bottom: 0,
          backgroundColor: 'white',
          borderTop: '1px solid #ccc',
          padding: 2,
          zIndex: 1000,
        }}>
          <Typography variant="subtitle2">
            {selectedMovieIds.length} movies selected.
          </Typography>

          {/* Button to trigger ICS file generation and download */}
          <Button variant="contained" color="success" onClick={handleGenerateIcs}>
            Add All to Calendar (.ics)
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

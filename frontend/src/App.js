import React, { useState } from 'react';
import {
  Container,
  Typography,
  Button,
  TextField,
  Box,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Stack,
  Grid,
  Divider,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Paper,
  Alert
} from '@mui/material';
import { getMoviesByCountry } from './services/api';
import MovieTable from './components/MovieTable';
import { COUNTRY_OPTIONS } from './utils/countries';
import Autocomplete from '@mui/material/Autocomplete';
import { saveAs } from 'file-saver';

export default function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState(COUNTRY_OPTIONS.find((c) => c.code === 'IE'));
  const [movies, setMovies] = useState([]);
  const [selectedMovieIds, setSelectedMovieIds] = useState([]);
  const [selectedReleaseTypes, setSelectedReleaseTypes] = useState([3]);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [hasSearched, setHasSearched] = useState(false);

  const handleToggleReleaseType = (typeId) => {
    setSelectedReleaseTypes((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  };

  const handleFetchMovies = async () => {
    if (!country?.code) {
      alert('Please select a valid country.');
      return;
    }

    setLoading(true);
    setMovies([]);
    setSelectedMovieIds([]);
    setHasSearched(true);

    try {
      const result = await getMoviesByCountry(
        country.code, 
        selectedReleaseTypes.join(','), 
        selectedYear
      );
      const fetchedMovies = result.data || [];
      setMovies(fetchedMovies);
      setSelectedMovieIds(fetchedMovies.map(m => m.movie_id));
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Cinema to Calendar
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Select your country and preferences to create a calendar of upcoming movie releases.
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Autocomplete
                options={COUNTRY_OPTIONS}
                getOptionLabel={(option) => option.name}
                renderOption={(props, option) => (
                  <Box component="li" sx={{ display: 'flex', alignItems: 'center' }} {...props}>
                    <img
                      src={option.flagUrl}
                      alt={option.code}
                      style={{ width: 20, marginRight: 8 }}
                    />
                    {option.name}
                  </Box>
                )}
                value={country}
                onChange={(_, newValue) => setCountry(newValue || country)}
                renderInput={(params) => (
                  <TextField {...params} label="Select Country" />
                )}
                isOptionEqualToValue={(option, value) => option.code === value.code}
              />
              <TextField
                select
                label="Select Year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                fullWidth
              >
                {[2024, 2025, 2026, 2027].map((year) => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Release Types:
              </Typography>
              <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
                {[
                  { id: 3, label: 'Theatrical' },
                  { id: 1, label: 'Premiere' },
                  { id: 4, label: 'Digital' }
                ].map(({ id, label }) => (
                  <FormControlLabel
                    key={id}
                    control={
                      <Checkbox
                        checked={selectedReleaseTypes.includes(id)}
                        onChange={() => handleToggleReleaseType(id)}
                      />
                    }
                    label={label}
                  />
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleFetchMovies}
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Fetching Movies...' : 'Fetch Movies'}
          </Button>
        </Box>


        {hasSearched && !loading && movies.length === 0 && (
        <Alert 
          severity="info" 
          sx={{ mt: 4 }}
        >
          No movies found for {country.name} in {selectedYear} with the selected release types.
          Try adjusting your filters or selecting a different year.
        </Alert>
      )}

      {movies.length > 0 && (
        <>
          <Divider sx={{ my: 4 }} />
          <MovieTable
            movies={movies}
            selectedMovieIds={selectedMovieIds}
            onToggleSelect={(id) => setSelectedMovieIds((prev) =>
              prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id]
            )}
          />
        </>
      )}

        {movies.length > 0 && (
          <Paper
            elevation={3}
            sx={{
              position: 'sticky',
              bottom: 16,
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle1">
              {selectedMovieIds.length} movies selected
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateIcs}
              size="large"
            >
              Download Calendar (.ics)
            </Button>
          </Paper>
        )}

        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" paragraph>
            This application uses TMDB and the TMDB APIs but is not endorsed, certified,
            or otherwise approved by TMDB.
          </Typography>
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={`${process.env.PUBLIC_URL}/tmdb-logo.svg`}
              alt="TMDB Logo"
              style={{ maxWidth: 150 }}
            />
          </a>
        </Box>
      </Paper>
    </Container>
  );
}
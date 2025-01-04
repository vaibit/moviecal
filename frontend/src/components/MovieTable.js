import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
  Tooltip,
  Box,
  Typography,
  Link
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} placement="right" arrow />
))(({ theme }) => ({
  [`& .MuiTooltip-tooltip`]: {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    maxWidth: 400,
    padding: theme.spacing(2),
    boxShadow: theme.shadows[4],
    border: `1px solid ${theme.palette.divider}`,
  },
}));

const MovieTable = ({ movies, selectedMovieIds, onToggleSelect }) => {
  const renderTooltipContent = (movie) => (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {movie.poster_url && (
        <img 
          src={movie.poster_url} 
          alt={movie.title}
          style={{ 
            width: 100, 
            height: 150, 
            objectFit: 'cover',
            borderRadius: 4 
          }}
        />
      )}
      <Box>
        <Typography variant="h6" gutterBottom>
          {movie.title}
        </Typography>
        <Typography variant="body2" paragraph>
          {movie.description || 'No description available'}
        </Typography>
        <Link 
          href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`}
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          sx={{ display: 'inline-block', mt: 1 }}
        >
          View on TMDB
        </Link>
      </Box>
    </Box>
  );

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                checked={selectedMovieIds.length === movies.length}
                indeterminate={selectedMovieIds.length > 0 && selectedMovieIds.length < movies.length}
                onChange={() => {
                  if (selectedMovieIds.length === movies.length) {
                    onToggleSelect([]);
                  } else {
                    onToggleSelect(movies.map(m => m.movie_id));
                  }
                }}
              />
            </TableCell>
            <TableCell>Title</TableCell>
            <TableCell>Release Date</TableCell>
            <TableCell>Release Type</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {movies.map((movie) => (
            <TableRow
              key={movie.movie_id}
              hover
              selected={selectedMovieIds.includes(movie.movie_id)}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedMovieIds.includes(movie.movie_id)}
                  onChange={() => onToggleSelect(movie.movie_id)}
                />
              </TableCell>
              <TableCell>
                <StyledTooltip title={renderTooltipContent(movie)}>
                  <span>{movie.title}</span>
                </StyledTooltip>
              </TableCell>
              <TableCell>{new Date(movie.release_date).toLocaleDateString()}</TableCell>
              <TableCell>
                {movie.release_type === 3 ? 'Theatrical' : 
                 movie.release_type === 1 ? 'Premiere' : 
                 movie.release_type === 4 ? 'Digital' : 'Unknown'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default MovieTable;
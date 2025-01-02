import React, { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Checkbox, TableSortLabel, Paper
} from '@mui/material';
import { RELEASE_TYPES } from '../utils/releaseTypes';

/** DESC comparator */
function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}

/** Return the comparator function for asc or desc */
function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

/** Stable sort, no side-effects, ensures tie-breaking by original index */
function stableSort(array, comparator) {
  const stabilized = array.map((el, idx) => [el, idx]);
  stabilized.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilized.map((el) => el[0]);
}

export default function MovieTable({ movies, selectedMovieIds, onToggleSelect }) {
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('release_date'); // or 'release_date', whichever you prefer

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Make a sorted copy of movies (importantly, do NOT mutate the original array)
  const sortedMovies = stableSort([...movies], getComparator(order, orderBy));

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {/* Checkbox Header (not sorting) */}
            <TableCell padding="checkbox" />
            
            {/* Title Column */}
            <TableCell sortDirection={orderBy === 'title' ? order : false}>
              <TableSortLabel
                active={orderBy === 'title'}
                direction={orderBy === 'title' ? order : 'asc'}
                onClick={(e) => handleRequestSort(e, 'title')}
              >
                Title
              </TableSortLabel>
            </TableCell>
            
            {/* Release Date Column */}
            <TableCell sortDirection={orderBy === 'release_date' ? order : false}>
              <TableSortLabel
                active={orderBy === 'release_date'}
                direction={orderBy === 'release_date' ? order : 'asc'}
                onClick={(e) => handleRequestSort(e, 'release_date')}
              >
                Release Date
              </TableSortLabel>
            </TableCell>
            
            {/* Country Column
            <TableCell>Country</TableCell> */}
            
            {/* Release Type Column */}
            <TableCell>Release Type</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {sortedMovies.map((movie) => {
            const isSelected = selectedMovieIds.includes(movie.movie_id);
            const releaseTypeText = RELEASE_TYPES[movie.release_type] || 'Unknown'; // Map release type ID to text

            return (
              <TableRow key={movie.movie_id} hover selected={isSelected}>
                {/* Checkbox */}
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => onToggleSelect(movie.movie_id)}
                    color="primary"
                    size="small" 
                  />
                </TableCell>

                {/* Title with TMDb Link */}
                <TableCell>
                  <a
                    href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    {movie.title}
                  </a>
                </TableCell>

                {/* Release Date */}
                <TableCell>{movie.release_date}</TableCell>

                {/* Country
                <TableCell>{movie.country_code}</TableCell> */}

                {/* Release Type */}
                <TableCell>{releaseTypeText}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
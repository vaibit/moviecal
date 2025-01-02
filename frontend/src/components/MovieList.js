// MovieList.js
import React from 'react';

const MovieList = ({ movies, selectedMovieIds, onToggleSelect }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Select</th>
          <th>Title</th>
          <th>Release Date</th>
          <th>Country</th>
        </tr>
      </thead>
      <tbody>
        {movies.map((movie) => (
            <tr key={movie.movie_id}>
            <td>
                <input
                type="checkbox"
                checked={selectedMovieIds.includes(movie.movie_id)}
                onChange={() => onToggleSelect(movie.movie_id)}
                />
            </td>
            <td>
                <a 
                href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                >
                {movie.title}
                </a>
            </td>
            <td>{movie.release_date}</td>
            <td>{movie.country_code}</td>
            </tr>
        ))}
      </tbody>
    </table>
  );
};

export default MovieList;

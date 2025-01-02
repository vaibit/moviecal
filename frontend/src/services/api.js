// src/services/api.js

const API_BASE_URL = 'http://127.0.0.1:5000';

// Existing fetch
export async function getMoviesByCountry(countryCode, releaseTypeString = '', year) {
  let url = `${API_BASE_URL}/movies/country/${countryCode}`;
  if (releaseTypeString) {
    url += `?release_type=${releaseTypeString}`;
  }
  if (year) {
    url += url.includes('?') ? `&year=${year}` : `?year=${year}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch movies for country ${countryCode}`);
  }
  return await response.json(); // { status: 'success', data: [...] }
}

// New function to POST selected movie IDs and get ICS
export async function downloadCustomIcs(movieIdsArray) {
  // We'll do a POST with JSON body
  const response = await fetch(`${API_BASE_URL}/movies/ics/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movie_ids: movieIdsArray })
  });

  if (!response.ok) {
    throw new Error(`Failed to generate ICS`);
  }

  // We expect the server to respond with something like:
  // a file download, or maybe a streaming ICS response
  // If your server is returning the file as an attachment,
  // you might need to read it as blob and create a download link:
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'selected_movies.ics');
  document.body.appendChild(link);
  link.click();
  link.remove();
}

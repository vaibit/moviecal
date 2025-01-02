import requests
import re
import uuid
from datetime import datetime
from ics import Calendar, Event
from models import db, MovieModel, ReleaseDateModel

# Fetch release dates from TMDb API
def fetch_release_dates(movie_id, api_key):
    url = f"https://api.themoviedb.org/3/movie/{movie_id}/release_dates"
    response = requests.get(url, params={"api_key": api_key})
    if response.status_code == 200:
        return response.json().get('results', [])
    return []

# Get movies by country
def get_movies_by_country(country_code):
    movies = db.session.query(MovieModel, ReleaseDateModel).join(ReleaseDateModel).filter(
        ReleaseDateModel.country_code == country_code
    ).all()
    return [{
        "id": movie.id,
        "title": movie.title,
        "description": movie.description,
        "poster_url": movie.poster_url,
        "country_code": release_date.country_code,
        "release_date": release_date.release_date.strftime('%Y-%m-%d'),
    } for movie, release_date in movies]

# Generate ICS file
def generate_ics_file(movies, file_name='movies.ics'):
    calendar = Calendar()

    for movie in movies:
        event = Event()
        event.name = f"{movie['title']} (Release)"
        event.begin = movie['release_date']  # e.g. "2025-01-15"
        event.make_all_day()
        event.description = movie['description']
        event.url = movie['poster_url']

        calendar.events.add(event)

    with open(file_name, 'w', encoding='utf-8') as f:
        f.write(str(calendar))
        

def fold_ics_lines(ics_text, max_length=75):
    """
    Fold lines longer than `max_length` characters according to RFC 5545:
      - Each line >75 chars is split, 
      - The next line starts with one space (" ") to indicate a continuation.
    """
    folded_lines = []
    for original_line in ics_text.split("\n"):
        line = original_line
        # Keep folding until within limit
        while len(line) > max_length:
            folded_lines.append(line[:max_length])
            # Insert a space at the start of the continued line
            line = " " + line[max_length:]
        folded_lines.append(line)
    # Re-join with LF for now; we’ll replace with CRLF later if desired
    return "\n".join(folded_lines)
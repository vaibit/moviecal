import os
import time
from datetime import datetime
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from tmdbv3api import TMDb, Discover
from dotenv import load_dotenv
import requests
from typing import List, Optional
import logging

# Load environment variables
load_dotenv()

# Initialize Flask app and SQLite database
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///moviesdb.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize TMDb API
tmdb = TMDb()
tmdb.api_key = os.getenv('TMDB_API_KEY')
tmdb.language = 'en'

# TMDb Discover API
tmdb_discover = Discover()

# Database Models (unchanged)
class MovieModel(db.Model):
    __tablename__ = 'movies'
    id = db.Column(db.Integer, primary_key=True)
    tmdb_id = db.Column(db.Integer, unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    poster_url = db.Column(db.String(255), nullable=True)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

class ReleaseDateModel(db.Model):
    __tablename__ = 'release_dates'
    id = db.Column(db.Integer, primary_key=True)
    movie_id = db.Column(db.Integer, db.ForeignKey('movies.id'), nullable=False)
    country_code = db.Column(db.String(2), nullable=False)
    release_date = db.Column(db.Date, nullable=False)
    release_type = db.Column(db.Integer, nullable=True)

class RateLimiter:
    def __init__(self, requests_per_second: float = 4.0):
        self.requests_per_second = requests_per_second
        self.last_request_time = 0
        self.request_count = 0

    def wait_if_needed(self):
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        
        if time_since_last_request < 1/self.requests_per_second:
            sleep_time = (1/self.requests_per_second) - time_since_last_request
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
        self.request_count += 1
        
        # Add a longer pause every 40 requests
        if self.request_count % 40 == 0:
            logger.info("Taking a longer break after 40 requests...")
            time.sleep(10)

def fetch_release_dates(movie_id: int, rate_limiter: RateLimiter) -> List[dict]:
    rate_limiter.wait_if_needed()
    url = f"https://api.themoviedb.org/3/movie/{movie_id}/release_dates"
    response = requests.get(url, params={"api_key": tmdb.api_key})
    
    if response.status_code == 200:
        return response.json().get('results', [])
    else:
        logger.error(f"Failed to fetch release dates for movie ID {movie_id}: {response.status_code}")
        return []

def fetch_movies_for_years(years: List[int], batch_size: int = 20, start_pages: Optional[dict] = None):
    """
    Fetch movies for multiple years with improved rate limiting and error handling.
    Allows resuming from a specific page for a given year.
    :param years: List of years to fetch movies for.
    :param batch_size: Number of movies to process before logging progress.
    :param start_pages: Dictionary mapping years to starting pages for resumption.
    """
    rate_limiter = RateLimiter()
    start_pages = start_pages or {}

    for year in years:
        logger.info(f"Starting to fetch movies for year {year}")
        page = start_pages.get(year, 1)  # Default to page 1 if no start page is specified
        total_pages = 1
        movies_processed = 0

        try:
            while page <= total_pages:
                rate_limiter.wait_if_needed()
                
                response = tmdb_discover.discover_movies({
                    "primary_release_year": year,
                    "page": page
                })

                if page == 1 or page == start_pages.get(year, 1):
                    total_pages = response.total_pages
                    logger.info(f"Year {year}: Found {total_pages} pages to process")

                with db.session.begin():
                    for movie in response.results:
                        try:
                            existing_movie = MovieModel.query.filter_by(tmdb_id=movie['id']).first()

                            if not existing_movie:
                                new_movie = MovieModel(
                                    tmdb_id=movie['id'],
                                    title=movie['title'],
                                    description=movie.get('overview', ''),
                                    poster_url=f"https://image.tmdb.org/t/p/w500{movie.get('poster_path', '')}"
                                )
                                db.session.add(new_movie)
                                db.session.flush()  # Get the ID of the new movie
                            else:
                                new_movie = existing_movie
                                logger.debug(f"Movie '{existing_movie.title}' already exists")

                            # Fetch and store release dates
                            release_dates = fetch_release_dates(movie['id'], rate_limiter)
                            for country in release_dates:
                                for date_info in country.get('release_dates', []):
                                    try:
                                        rd_str = date_info['release_date'][:10]
                                        rd_date = datetime.strptime(rd_str, '%Y-%m-%d').date()
                                        rd_type = date_info.get('type')

                                        if not ReleaseDateModel.query.filter_by(
                                            movie_id=new_movie.id,
                                            country_code=country['iso_3166_1'],
                                            release_date=rd_date,
                                            release_type=rd_type
                                        ).first():
                                            new_release_date = ReleaseDateModel(
                                                movie_id=new_movie.id,
                                                country_code=country['iso_3166_1'],
                                                release_date=rd_date,
                                                release_type=rd_type
                                            )
                                            db.session.add(new_release_date)
                                    except (ValueError, KeyError) as e:
                                        logger.error(f"Error processing release date for movie {movie['id']}: {e}")

                            movies_processed += 1
                            if movies_processed % batch_size == 0:
                                logger.info(f"Year {year}: Processed {movies_processed} movies")
                                
                        except Exception as e:
                            logger.error(f"Error processing movie {movie.get('id')}: {e}")
                            continue

                logger.info(f"Year {year}: Completed page {page} of {total_pages}")
                page += 1

        except Exception as e:
            logger.error(f"Error processing year {year}: {e}")
            continue

        logger.info(f"Completed processing for year {year}. Total movies processed: {movies_processed}")

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        years_to_fetch = [2024, 2025, 2026]
        # Specify the page to resume from for 2024
        start_pages = {2024: 331}
        fetch_movies_for_years(years_to_fetch, start_pages=start_pages)
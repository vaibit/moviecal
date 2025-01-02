import os
import time
from datetime import datetime
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from tmdbv3api import TMDb, Discover
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

# Initialize Flask app and SQLite database
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///moviesdb.db'  # SQLite database
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
app.config.from_object('config.Config')


# Initialize TMDb API
tmdb = TMDb()
tmdb.api_key = os.getenv('TMDB_API_KEY')
tmdb.language = 'en'

# TMDb Discover API
tmdb_discover = Discover()

# Database Models
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
    release_type = db.Column(db.Integer, nullable=True)  # e.g., 1 = Premiere, 3 = Theatrical

# Create tables
with app.app_context():
    db.create_all()

# Function to fetch release dates for a movie
def fetch_release_dates(movie_id):
    url = f"https://api.themoviedb.org/3/movie/{movie_id}/release_dates"
    response = requests.get(url, params={"api_key": tmdb.api_key})
    if response.status_code == 200:
        return response.json().get('results', [])
    else:
        print(f"Failed to fetch release dates for movie ID {movie_id}")
        return []

# Function to fetch and store movies for 2025 with release dates
def fetch_2025_movies_with_release_dates():
    print("Fetching movies releasing in 2025...")
    page = 1
    total_pages = 1  # Placeholder until we get the first page response

    while page <= total_pages:
        # Discover movies by release year (2025)
        response = tmdb_discover.discover_movies({
            "primary_release_year": 2025,
            "page": page
        })

        # Update total pages from the first response
        if page == 1:
            total_pages = response.total_pages
            print(f"Total pages to fetch: {total_pages}")

        # Process each movie in the current page
        for movie in response.results:
            # Check if movie exists in the database
            existing_movie = MovieModel.query.filter_by(tmdb_id=movie['id']).first()

            if not existing_movie:
                # Add new movie
                new_movie = MovieModel(
                    tmdb_id=movie['id'],
                    title=movie['title'],
                    description=movie.get('overview', ''),
                    poster_url=f"https://image.tmdb.org/t/p/w500{movie.get('poster_path', '')}",
                )
                db.session.add(new_movie)
                db.session.commit()
            else:
                new_movie = existing_movie
                print(f"Movie '{existing_movie.title}' already exists. Skipping movie creation.")

            # Fetch release dates for the movie
            release_dates = fetch_release_dates(movie['id'])
            for country in release_dates:
                for date_info in country.get('release_dates', []):
                    rd_str = date_info['release_date'][:10]  # "YYYY-MM-DD"
                    rd_date = datetime.strptime(rd_str, '%Y-%m-%d').date()
                    rd_type = date_info.get('type')  # numeric code from TMDb, e.g. 1, 3, etc.

                    existing_release_date = ReleaseDateModel.query.filter_by(
                        movie_id=new_movie.id,
                        country_code=country['iso_3166_1'],
                        release_date=rd_date,
                        release_type=rd_type
                    ).first()

                    if not existing_release_date:
                        new_release_date = ReleaseDateModel(
                            movie_id=new_movie.id,
                            country_code=country['iso_3166_1'],
                            release_date=rd_date,
                            release_type=rd_type
                        )
                        db.session.add(new_release_date)
            db.session.commit()

        print(f"Page {page} of {total_pages} fetched successfully.")
        db.session.commit()
        page += 1

        # Respect TMDb rate limits: delay after every batch of requests
        if page % 40 == 0:
            print("Rate limit reached. Waiting for 10 seconds...")
            time.sleep(10)

    print("All 2025 movies with release dates fetched and stored successfully.")


# Function to fetch movies for a specific country
def get_movies_by_country(country_code):
    print(f"Fetching movies for country: {country_code}")
    movies = db.session.query(MovieModel, ReleaseDateModel).join(ReleaseDateModel).filter(
        ReleaseDateModel.country_code == country_code
    ).all()

    results = []
    for movie, release_date in movies:
        results.append({
            "id": movie.id,
            "title": movie.title,
            "description": movie.description,
            "poster_url": movie.poster_url,
            "country_code": release_date.country_code,
            "release_date": release_date.release_date.strftime('%Y-%m-%d'),
        })

    return results

# Function to fetch movies for a specific release date
def get_movies_by_release_date(release_date):
    print(f"Fetching movies for release date: {release_date}")
    movies = db.session.query(MovieModel, ReleaseDateModel).join(ReleaseDateModel).filter(
        ReleaseDateModel.release_date == release_date
    ).all()

    results = []
    for movie, release_date in movies:
        results.append({
            "id": movie.id,
            "title": movie.title,
            "description": movie.description,
            "poster_url": movie.poster_url,
            "country_code": release_date.country_code,
            "release_date": release_date.release_date.strftime('%Y-%m-%d'),
        })

    return results


# Run the script
if __name__ == "__main__":
    with app.app_context():
        fetch_2025_movies_with_release_dates()

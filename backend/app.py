from flask import Flask, jsonify, request, send_file
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from models import db, MovieModel, ReleaseDateModel
from services import fetch_release_dates, get_movies_by_country, generate_ics_file
from flask_cors import CORS
from flask_caching import Cache
from sqlalchemy import extract
from sqlalchemy import func, and_

# Initialize Flask app
app = Flask(__name__)
app.config.from_object('config.Config')  # Load configuration from config.py
CORS(app)  # enable all CORS requests for development
app.config['CACHE_TYPE'] = 'SimpleCache'  # Use 'FileSystemCache' or 'RedisCache' in production
app.config['CACHE_DEFAULT_TIMEOUT'] = 300  # 5 minutes
cache = Cache(app)

# Initialize database
db.init_app(app)

# Create tables
with app.app_context():
    db.create_all()

# API Endpoint: Fetch movies by country
@app.route('/movies/country/<country_code>', methods=['GET'])
@cache.cached(query_string=True)
def get_movies_by_country(country_code):
    from flask import request, jsonify
    
    release_type_param = request.args.get('release_type')  # "1,3" etc.
    year_param = request.args.get('year')  # Year filter

    query = db.session.query(MovieModel, ReleaseDateModel).join(ReleaseDateModel)
    query = query.filter(ReleaseDateModel.country_code == country_code)

    if release_type_param:
        try:
            types_list = [int(x) for x in release_type_param.split(',')]
            query = query.filter(ReleaseDateModel.release_type.in_(types_list))
        except ValueError:
            pass  # Handle invalid parameters gracefully
    
    if year_param:
        try:
            year = int(year_param)
            # Use the extract function to filter by year
            query = query.filter(extract('year', ReleaseDateModel.release_date) == year)
        except ValueError:
            pass  # Handle invalid year gracefully

    
    # Default to Theatrical (3) if no release_type_param is provided
    if not release_type_param:
        query = query.filter(ReleaseDateModel.release_type == 3)
    
    query = query.order_by(ReleaseDateModel.release_date.asc())

    results = query.all()

    data = []
    for (movie, rd) in results:
        data.append({
            "movie_id": movie.id,
            "tmdb_id": movie.tmdb_id,
            "title": movie.title,
            "description": movie.description,
            "poster_url": movie.poster_url,
            "country_code": rd.country_code,
            "release_type": rd.release_type,
            "release_date": rd.release_date.strftime('%Y-%m-%d'),
        })

    return jsonify({"status": "success", "data": data})


# API Endpoint: Generate ICS file by country
@app.route('/movies/ics/country/<country_code>', methods=['GET'])
def generate_ics_by_country(country_code):
    from flask import request, send_file
    
    release_type_param = request.args.get('release_type')  # e.g. "1,3"
    query = db.session.query(MovieModel, ReleaseDateModel).join(ReleaseDateModel)
    query = query.filter(ReleaseDateModel.country_code == country_code)
    
    if release_type_param:
        try:
            types_list = [int(x) for x in release_type_param.split(',')]
            query = query.filter(ReleaseDateModel.release_type.in_(types_list))
        except ValueError:
            pass
    else:
        # Default to Theatrical (3) if no release_type_param is provided
        query = query.filter(ReleaseDateModel.release_type == 3)

    results = query.all()
    movies = []
    for movie, rd in results:
        movies.append({
            "title": movie.title,
            "release_date": rd.release_date.strftime('%Y-%m-%d'),
            "description": movie.description,
            "poster_url": movie.poster_url
        })

    file_name = f"movies_{country_code}_release_calendar.ics"
    generate_ics_file(movies, file_name)  # your custom function to create ICS
    return send_file(file_name, as_attachment=True, download_name=file_name)


@app.route('/movies/ics/custom', methods=['POST'])
def generate_custom_ics():
    data = request.get_json()

    # Get the data passed from the frontend
    movie_ids = data.get('movie_ids', [])
    country_code = data.get('country_code', None)
    year = data.get('year', None)
    release_types = data.get('release_types', '').split(',')

    if not movie_ids or not country_code or not year or not release_types:
        return jsonify({"status": "error", "message": "Missing required parameters"}), 400

    # Query DB for these IDs and filter by country, year, and release types
    query = db.session.query(MovieModel, ReleaseDateModel).join(ReleaseDateModel).filter(
        MovieModel.id.in_(movie_ids),
        ReleaseDateModel.country_code == country_code,
        extract('year', ReleaseDateModel.release_date) == year,  # Extract year from release_date
        ReleaseDateModel.release_type.in_(release_types)
    ).all()
    print(f"Query returned {len(query)} results.")  # Log the number of results


    # Build a list of dicts for ICS generation
    movies = []
    for movie, rd in query:
        movies.append({
            "title": movie.title,
            "release_date": rd.release_date.strftime('%Y-%m-%d'),
            "description": movie.description,
            "poster_url": movie.poster_url,
        })

    if not movies:
        return jsonify({"status": "error", "message": "No movies found for the specified filters"}), 404

    # Generate ICS from these movies
    file_name = f"movies_{country_code}_{year}_release_calendar.ics"
    generate_ics_file(movies, file_name)  # your custom function to create ICS

    # Return the ICS file as a download
    return send_file(file_name, as_attachment=True, download_name=file_name, mimetype='text/calendar')


@app.route('/debug/dbpath', methods=['GET'])
def debug_db_path():
    return f"DB Path: {app.config['SQLALCHEMY_DATABASE_URI']}"


# Run the app
if __name__ == '__main__':
    app.run(debug=True)
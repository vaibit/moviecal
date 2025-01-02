from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

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
    release_type = db.Column(db.Integer, nullable=True)  # e.g., 1=Premiere, 3=Theatrical

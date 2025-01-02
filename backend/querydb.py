with app.app_context():
    movies = MovieModel.query.all()
    for movie in movies:
        print(f"Title: {movie.title}, TMDb ID: {movie.tmdb_id}")
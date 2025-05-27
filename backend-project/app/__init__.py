from flask import Flask
from .config import Config
from .extensions import db, cors

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    cors.init_app(app)
    
    # Register blueprints
    from .routes import main_bp
    app.register_blueprint(main_bp)
    
    return app
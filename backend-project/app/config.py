import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-123')
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/insightpaper')
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    ALLOWED_EXTENSIONS = {'pdf', 'docx'}
    MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20MB
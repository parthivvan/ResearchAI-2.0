import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # File Handling
    UPLOAD_FOLDER = "uploads"
    ALLOWED_EXTENSIONS = {"pdf", "docx"}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # Database
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    DATABASE_NAME = "insightpaper"
    
    # Models
    LLM_MODEL = "google/flan-t5-base"
    EMBEDDING_MODEL = "all-MiniLM-L6-v2"
    
    # RAG Parameters
    CHUNK_SIZE = 1000  # characters
    CHUNK_OVERLAP = 200
    TOP_K = 3  # Number of chunks to retrieve
    
    # ChromaDB
    CHROMA_PATH = "chroma_db"
    COLLECTION_NAME = "research_papers"
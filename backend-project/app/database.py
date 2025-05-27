# app/database.py
from pymongo import MongoClient
import os

def get_db():
    client = MongoClient(
        host=os.getenv('MONGO_HOST'),
        # ... your connection config ...
    )
    return client[os.getenv('MONGO_DB')]
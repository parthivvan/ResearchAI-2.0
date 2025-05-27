from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename
from .extensions import db
import os
from datetime import datetime
from bson import ObjectId
import PyPDF2
import docx

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def home():
    return "Welcome to the API"

@main_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in {'pdf', 'docx'}:
        filename = secure_filename(file.filename)
        filepath = os.path.join(main_bp.root_path, 'uploads', filename)
        file.save(filepath)
        
        try:
            # Process file and save to MongoDB
            file_data = {
                "filename": filename,
                "upload_date": datetime.now(),
                "status": "processed"
            }
            db.db.files.insert_one(file_data)
            
            return jsonify({"success": True, "file_id": str(file_data['_id'])})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            if os.path.exists(filepath):
                os.remove(filepath)
    
    return jsonify({"error": "Invalid file type"}), 400
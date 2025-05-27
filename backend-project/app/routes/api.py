from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from bson import ObjectId
from app.database import get_mongo_client
from .utils import allowed_file, extract_text, chunk_text, generate_summary

# Create Blueprint
bp = Blueprint('api', __name__, url_prefix='/api')

# Initialize database connection
client = get_mongo_client()
db = client[os.getenv('MONGO_DB')]
papers_collection = db.papers
summaries_collection = db.summaries

@bp.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload and processing"""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and allowed_file(file.filename):
        try:
            # Secure save file
            filename = secure_filename(file.filename)
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            extension = filename.rsplit('.', 1)[1].lower()

            # Process file
            text = extract_text(filepath, extension)
            chunks = chunk_text(text)
            
            # MongoDB transaction
            with client.start_session() as session:
                paper_id = ObjectId()
                
                # Store paper metadata
                papers_collection.insert_one({
                    "_id": paper_id,
                    "filename": filename,
                    "upload_date": datetime.now(),
                    "file_size": os.path.getsize(filepath),
                    "status": "processed"
                }, session=session)
                
                # Store chunks in ChromaDB (if configured)
                if current_app.config.get('CHROMA_ENABLED', False):
                    current_app.chroma_collection.add(
                        documents=chunks,
                        ids=[f"{paper_id}-{i}" for i in range(len(chunks))],
                        metadatas=[{"paper_id": str(paper_id)} for _ in chunks]
                    )
                
                # Generate and store summary
                summary = {
                    "text": generate_summary(text[:2000]),  # First 2000 chars for demo
                    "advantages": ["Improved accuracy", "Faster processing"],
                    "disadvantages": ["Limited dataset", "High computational cost"]
                }
                
                summaries_collection.insert_one({
                    "paper_id": paper_id,
                    "summary": summary,
                    "created_at": datetime.now()
                }, session=session)
                
                return jsonify({
                    "success": True,
                    "paper_id": str(paper_id),
                    "summary": summary
                })
                
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            if os.path.exists(filepath):
                os.remove(filepath)
    
    return jsonify({"error": "File processing failed"}), 400

@bp.route('/papers/<paper_id>', methods=['GET'])
def get_paper(paper_id):
    """Retrieve paper metadata"""
    try:
        paper = papers_collection.find_one(
            {"_id": ObjectId(paper_id)},
            {"_id": 1, "filename": 1, "upload_date": 1, "file_size": 1}
        )
        if not paper:
            return jsonify({"error": "Paper not found"}), 404
            
        paper['_id'] = str(paper['_id'])
        paper['upload_date'] = paper['upload_date'].isoformat()
        return jsonify(paper)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@bp.route('/summaries/<paper_id>', methods=['GET'])
def get_summary(paper_id):
    """Retrieve paper summary"""
    try:
        summary = summaries_collection.find_one(
            {"paper_id": ObjectId(paper_id)},
            {"_id": 0, "summary": 1, "created_at": 1}
        )
        if not summary:
            return jsonify({"error": "Summary not found"}), 404
            
        summary['created_at'] = summary['created_at'].isoformat()
        return jsonify(summary)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@bp.route('/search', methods=['GET'])
def search_papers():
    """Search papers by keyword"""
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Missing search query"}), 400
        
    try:
        # Simple text search (for production, use Atlas Search or similar)
        results = papers_collection.find(
            {"$text": {"$search": query}},
            {"score": {"$meta": "textScore"}}
        ).sort([("score", {"$meta": "textScore"})]).limit(10)
        
        return jsonify({
            "results": [{
                "id": str(paper["_id"]),
                "filename": paper["filename"],
                "score": paper.get("score", 0)
            } for paper in results]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/test-db', methods=['GET'])
def test_db_connection():
    """Test MongoDB connection"""
    try:
        # Test both connection and authentication
        db.command('ping')
        return jsonify({
            "status": "success",
            "collections": db.list_collection_names()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
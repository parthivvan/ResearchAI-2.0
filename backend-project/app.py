from flask import Flask, request, jsonify
from flask_cors import CORS
import os, logging, uuid, re
from pathlib import Path
from datetime import datetime
from transformers import T5Tokenizer, T5ForConditionalGeneration
from PyPDF2 import PdfReader
from werkzeug.utils import secure_filename
import docx
from chromadb import PersistentClient
from pymongo import MongoClient
import torch
from pdf2image import convert_from_path
import pytesseract
import fitz
from torch.cuda import is_available as cuda_is_available
from werkzeug.security import generate_password_hash, check_password_hash

# Initialize Flask and configs
app = Flask(__name__)
CORS(app)
BASE_DIR = Path(__file__).parent
UPLOAD_FOLDER = BASE_DIR / 'uploads'
UPLOAD_FOLDER.mkdir(exist_ok=True)
app.config.update(
    UPLOAD_FOLDER=str(UPLOAD_FOLDER),
    MAX_CONTENT_LENGTH=10 * 1024 * 1024  # 10MB max
)

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize databases
try:
    chroma_client = PersistentClient(path=str(BASE_DIR / "chroma_db"))
    collection = chroma_client.get_or_create_collection("research_papers")
    mongo_client = MongoClient('mongodb://localhost:27017/')
    db = mongo_client['researchai']
    history_collection = db['History']
    users_collection = db['users']
except Exception as e:
    logger.error(f"Database initialization failed: {str(e)}")
    raise

# Initialize AI model
try:
    device = torch.device("cuda" if cuda_is_available() else "cpu")
    tokenizer = T5Tokenizer.from_pretrained("google/flan-t5-base")
    model = T5ForConditionalGeneration.from_pretrained("google/flan-t5-base").to(device)
    model.eval()
    torch.set_grad_enabled(False)
except Exception as e:
    logger.error(f"Model loading failed: {str(e)}")
    raise

# Core helper functions
def validate_file(file):
    if not file or file.filename == '': return False, "No file selected"
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > app.config['MAX_CONTENT_LENGTH']: return False, "File too large"
    if file.filename.lower().split('.')[-1] not in ['pdf', 'docx', 'txt']:
        return False, "Unsupported file type"
    return True, ""

def extract_text(filepath, ext):
    try:
        if ext == 'pdf':
            doc = fitz.open(filepath)
            text = "\n".join(page.get_text() for page in doc[:50])
            if len(text.strip()) < 100:
                images = convert_from_path(filepath, dpi=300)
                text = "\n".join(pytesseract.image_to_string(img) for img in images[:50])
        elif ext == 'docx':
            doc = docx.Document(filepath)
            text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        else:
            with open(filepath, 'r', encoding='utf-8') as f:
                text = f.read(500000)
        return clean_text(text) if text else None
    except Exception as e:
        logger.error(f"Text extraction error: {str(e)}")
        return None

def clean_text(text):
    text = re.sub(r'http\S+|www\S+|https\S+|\s+', ' ', text)
    return text.strip()[:100000]

def generate_response(prompt, max_length=512, temperature=0.7):
    """Generate text response using FLAN-T5"""
    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        max_length=512,  # Reduced from 1024
        truncation=True,
        padding=True
    ).to(device)
    
    with torch.no_grad():
        output_ids = model.generate(
            input_ids=inputs.input_ids,
            attention_mask=inputs.attention_mask,
            max_length=max_length,
            min_length=max_length//2,
            num_beams=4,
            no_repeat_ngram_size=3,
            early_stopping=True,
            temperature=temperature
        )
    
    return tokenizer.decode(output_ids[0], skip_special_tokens=True)

# API Endpoints
@app.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')

        if not name or not email or not password:
            return jsonify({"error": "All fields are required"}), 400

        users_collection = db['users']
        if users_collection.find_one({"email": email}):
            return jsonify({"error": "Email already registered"}), 400

        user_id = str(uuid.uuid4())
        users_collection.insert_one({
            "user_id": user_id,
            "name": name,
            "email": email,
            "password_hash": generate_password_hash(password)
        })

        return jsonify({"message": "Signup successful", "user_id": user_id}), 200

    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        users_collection = db['users']
        user = users_collection.find_one({"email": email})

        # This is correct:
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({"error": "Invalid email or password"}), 401

        return jsonify({"message": "Login successful", "user_id": user['user_id']}), 200

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
    
@app.route('/summarize', methods=['POST'])
def summarize():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
            
        user_id = request.form.get('user_id')
        print(f"Received user_id in /summarize: {user_id}")  # Debug log
        
        if not user_id:
            return jsonify({"error": "No user_id provided"}), 401
            
        file = request.files['file']
        valid, message = validate_file(file)
        if not valid:
            return jsonify({"error": message}), 400
        
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        ext = filename.lower().split('.')[-1]
        text = extract_text(filepath, ext)
        if not text:
            return jsonify({"error": "Text extraction failed"}), 500
        
        doc_id = str(uuid.uuid4())
        
        # Save to ChromaDB
        collection.add(
            ids=[doc_id],
            documents=[text],
            metadatas=[{
                "source": filename,
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id
            }]
        )
        
        # Save to MongoDB
        history_doc = {
            "doc_id": doc_id,
            "filename": filename,
            "timestamp": datetime.utcnow(),
            "status": "uploaded",
            "user_id": user_id,  # Make sure this is saved
            "text_preview": text[:200] + "..." if len(text) > 200 else text
        }
        
        print(f"Saving to MongoDB with user_id: {user_id}")  # Debug log
        history_collection.insert_one(history_doc)
        
        return jsonify({
            "message": "File uploaded successfully",
            "doc_id": doc_id,
            "source": filename
        })
        
    except Exception as e:
        print(f"Error in /summarize: {str(e)}")  # Debug log
        logger.error(f"Summarize error: {str(e)}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# Update the generate_summary function
@app.route('/generate_summary', methods=['POST'])
def generate_summary():
    try:
        data = request.get_json()
        doc_id = data.get('doc_id')

        if not doc_id:
            return jsonify({"error": "Missing document ID"}), 400

        # Initialize progress
        history_collection.update_one(
            {"doc_id": doc_id},
            {"$set": {
                "status": "processing",
                "progress": 0,
                "processing_start": datetime.utcnow()
            }}
        )

        # Get document
        results = collection.get(ids=[doc_id], include=["documents", "metadatas"])
        if not results['documents']:
            return jsonify({"error": "Document not found"}), 404

        text = results['documents'][0]
        filename = results['metadatas'][0].get('source', 'unknown')

        # Extract full document sections with better coverage
        text_length = len(text)
        intro_section = text[:5000]  # Increased from 3000
        middle_section = text[text_length//4:3*text_length//4]  # Take middle 50%
        conclusion_section = text[-4000:]  # Increased from 2500

        # Update progress - 20%
        history_collection.update_one(
            {"doc_id": doc_id},
            {"$set": {"progress": 20}}
        )

        # Enhanced summary generation prompt
        summary_prompt = f"""Write a comprehensive research paper summary in 500-600 words. Include:

1. Research Context & Problem (100 words):
- Field background and context
- Research gap addressed
- Research objectives and questions
- Expected contributions

2. Methodology & Approach (150 words):
- Research design details
- Data collection methods
- Analysis procedures
- Study population/sample characteristics
- Tools and techniques used

3. Key Findings & Results (200 words):
- Main discoveries and insights
- Important statistics and data
- Significant relationships/patterns
- Supporting evidence and examples
- Unexpected findings

4. Discussion & Implications (150 words):
- Interpretation of findings
- Theoretical implications
- Practical applications
- Limitations and future directions
- Overall research contribution

Document: {filename}

Content:
[Introduction]
{intro_section}

[Main Content]
{middle_section}

[Conclusion]
{conclusion_section}

Write a clear, detailed summary covering all sections."""

        # Generate summary with enhanced parameters
        inputs = tokenizer(
            summary_prompt,
            return_tensors="pt",
            max_length=2048,  # Increased for better context
            truncation=True,
            padding=True
        ).to(device)

        with torch.no_grad():
            summary_ids = model.generate(
                inputs.input_ids,
                max_length=800,  # Increased for longer summary
                min_length=600,  # Ensure minimum length
                num_beams=5,
                no_repeat_ngram_size=3,
                early_stopping=True,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                repetition_penalty=1.2
            )
        
        raw_summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        
        # Clean and improve summary
        summary = clean_and_improve_text(raw_summary, target_length=600)  # Increased length

        # Update progress - 50%
        history_collection.update_one(
            {"doc_id": doc_id},
            {"$set": {"progress": 50}}
        )

        # Generate advantages with specific research focus
        advantages_prompt = f"""Analyze this research paper and identify exactly 3 distinct strengths. Be specific and evidence-based.

Research Content:
{intro_section}
{middle_section}

List 3 strengths in this format:
1. [Specific strength with evidence]
2. [Different strength with evidence]
3. [Third distinct strength with evidence]

Focus on:
- Novel methodology or approach
- Strong data quality or sample size
- Significant practical implications
- Theoretical contributions
- Rigorously analysis methods

Each point should be 15-25 words and backed by evidence from the text."""

        with torch.no_grad():
            adv_ids = model.generate(
                tokenizer(advantages_prompt, return_tensors="pt", max_length=1200, truncation=True).input_ids.to(device),
                max_length=150,
                temperature=0.6,
                num_beams=4,
                no_repeat_ngram_size=3,
                do_sample=True,
                repetition_penalty=1.3
            )
        
        advantages_text = tokenizer.decode(adv_ids[0], skip_special_tokens=True)
        advantages = extract_and_clean_points(advantages_text, "advantages")

        # Update progress - 75%
        history_collection.update_one(
            {"doc_id": doc_id},
            {"$set": {"progress": 75}}
        )

        # Generate limitations with specific focus
        disadvantages_prompt = f"""Analyze this research paper and identify exactly 3 distinct limitations. Be constructive and specific.

Research Content:
{middle_section}
{conclusion_section}

List 3 limitations in this format:
1. [Specific limitation with explanation]
2. [Different limitation with explanation]
3. [Third distinct limitation with explanation]

Focus on:
- Sample size or selection bias
- Methodological constraints
- Scope or generalizability issues
- Data collection limitations
- Analysis or interpretation concerns

Each point should be 15-25 words and explain why it's a limitation."""

        with torch.no_grad():
            disadv_ids = model.generate(
                tokenizer(disadvantages_prompt, return_tensors="pt", max_length=1200, truncation=True).input_ids.to(device),
                max_length=150,
                temperature=0.6,
                num_beams=4,
                no_repeat_ngram_size=3,
                do_sample=True,
                repetition_penalty=1.3
            )
        
        disadvantages_text = tokenizer.decode(disadv_ids[0], skip_special_tokens=True)
        disadvantages = extract_and_clean_points(disadvantages_text, "disadvantages")

        # Final quality validation
        if len(advantages) < 3:
            advantages = generate_fallback_advantages(intro_section, middle_section)
        if len(disadvantages) < 3:
            disadvantages = generate_fallback_limitations(middle_section, conclusion_section)

        # Ensure no overlap between advantages and disadvantages
        advantages, disadvantages = ensure_distinct_points(advantages, disadvantages)

        # Save results
        history_collection.update_one(
            {"doc_id": doc_id},
            {"$set": {
                "status": "completed",
                "progress": 100,
                "summary": summary,
                "advantages": advantages,
                "disadvantages": disadvantages,
                "last_updated": datetime.utcnow()
            }}
        )

        # Clear CUDA cache
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        return jsonify({
            "summary": summary,
            "advantages": advantages,
            "disadvantages": disadvantages,
            "doc_id": doc_id,
            "source": filename
        })

    except Exception as e:
        logger.error(f"Generate summary error: {str(e)}")
        history_collection.update_one(
            {"doc_id": doc_id},
            {"$set": {
                "status": "failed",
                "error": str(e)
            }}
        )
        return jsonify({"error": str(e)}), 500


def clean_and_improve_text(text, target_length=250):
    """Clean and improve generated text quality"""
    import re
    
    # Remove the original prompt if it appears in output
    text = re.sub(r'^.*?Write.*?summary.*?:', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'^.*?Document Title.*?:', '', text, flags=re.DOTALL | re.IGNORECASE)
    
    # Fix common grammar issues
    text = re.sub(r'\s+', ' ', text)  # Multiple spaces
    text = re.sub(r'([.!?])\s*([a-z])', r'\1 \2', text)  # Space after punctuation
    text = re.sub(r'([a-z])([A-Z])', r'\1. \2', text)  # Missing periods
    
    # Split into sentences and clean
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    
    # Rebuild with proper capitalization
    cleaned_sentences = []
    for sentence in sentences:
        if sentence:
            sentence = sentence[0].upper() + sentence[1:] if len(sentence) > 1 else sentence.upper()
            cleaned_sentences.append(sentence)
    
    # Join and trim to target length
    result = '. '.join(cleaned_sentences)
    
    # Trim to approximately target word count
    words = result.split()
    if len(words) > target_length:
        result = ' '.join(words[:target_length])
        # Ensure it ends with proper punctuation
        if not result.endswith(('.', '!', '?')):
            result += '.'
    
    return result


def extract_and_clean_points(text, point_type):
    """Extract and clean advantage/disadvantage points"""
    import re
    
    # Remove prompt text if it appears
    text = re.sub(r'^.*?List \d+.*?:', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'^.*?Focus on.*?:', '', text, flags=re.DOTALL | re.IGNORECASE)
    
    # Extract numbered points
    points = []
    patterns = [
        r'(\d+\.?\s*[^\n]+)',  # 1. Point
        r'([•\-]\s*[^\n]+)',   # • Point or - Point
        r'([^\n]+)'            # Any line
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text)
        if matches and len(matches) >= 2:
            points = matches
            break
    
    # Clean and filter points
    cleaned_points = []
    for point in points:
        # Remove numbering and bullets
        clean_point = re.sub(r'^\d+\.?\s*', '', point).strip()
        clean_point = re.sub(r'^[•\-]\s*', '', clean_point).strip()
        
        # Filter quality points
        if (len(clean_point.split()) >= 10 and 
            len(clean_point.split()) <= 30 and
            clean_point not in cleaned_points):
            cleaned_points.append(clean_point)
        
        if len(cleaned_points) >= 3:
            break
    
    return cleaned_points[:3]


def generate_fallback_advantages(intro_section, middle_section):
    """Generate fallback advantages when primary generation fails"""
    fallback_advantages = []
    
    # Look for methodological strengths
    if any(word in intro_section.lower() for word in ['novel', 'innovative', 'comprehensive', 'rigorous']):
        fallback_advantages.append("Employs innovative and rigorous research methodology for comprehensive analysis")
    
    # Look for data quality indicators
    if any(word in middle_section.lower() for word in ['large sample', 'statistical', 'significant']):
        fallback_advantages.append("Utilizes substantial dataset with robust statistical analysis methods")
    
    # Look for practical implications
    if any(word in middle_section.lower() for word in ['practical', 'application', 'implementation']):
        fallback_advantages.append("Provides clear practical applications and actionable insights for implementation")
    
    return fallback_advantages[:3] if fallback_advantages else [
        "Addresses important research gap with systematic approach",
        "Employs appropriate methodology for research objectives",
        "Contributes valuable insights to existing knowledge base"
    ]


def generate_fallback_limitations(middle_section, conclusion_section):
    """Generate fallback limitations when primary generation fails"""
    fallback_limitations = []
    
    # Look for scope limitations
    if any(word in conclusion_section.lower() for word in ['limited', 'constraint', 'scope']):
        fallback_limitations.append("Research scope may limit generalizability of findings across different contexts")
    
    # Look for sample limitations
    if any(word in middle_section.lower() for word in ['small sample', 'limited data']):
        fallback_limitations.append("Sample size constraints may affect statistical power and result reliability")
    
    # Look for methodological constraints
    if any(word in middle_section.lower() for word in ['cross-sectional', 'survey', 'self-report']):
        fallback_limitations.append("Methodological approach may introduce potential bias in data collection")
    
    return fallback_limitations[:3] if fallback_limitations else [
        "Sample characteristics may limit broader applicability of results",
        "Cross-sectional design prevents establishment of causal relationships",
        "Future research needed to validate findings in different populations"
    ]


def ensure_distinct_points(advantages, disadvantages):
    """Ensure advantages and disadvantages are distinct and non-overlapping"""
    import difflib
    
    cleaned_advantages = []
    cleaned_disadvantages = []
    
    # Check for similarity between advantages and disadvantages
    for adv in advantages:
        is_similar = False
        for disadv in disadvantages:
            similarity = difflib.SequenceMatcher(None, adv.lower(), disadv.lower()).ratio()
            if similarity > 0.6:  # 60% similarity threshold
                is_similar = True
                break
        if not is_similar:
            cleaned_advantages.append(adv)
    
    # Ensure we have distinct disadvantages
    for disadv in disadvantages:
        is_similar = False
        for adv in advantages:
            similarity = difflib.SequenceMatcher(None, disadv.lower(), adv.lower()).ratio()
            if similarity > 0.6:
                is_similar = True
                break
        if not is_similar:
            cleaned_disadvantages.append(disadv)
    
    return cleaned_advantages[:3], cleaned_disadvantages[:3]

@app.route('/ask', methods=['POST'])
def ask_question():
    try:
        data = request.get_json()
        question = data.get('question', '').strip()
        doc_id = data.get('doc_id')
        
        if not question or not doc_id:
            return jsonify({"error": "Missing question or document ID"}), 400
            
        results = collection.get(ids=[doc_id], include=["documents"])
        if not results['documents']:
            return jsonify({"error": "Document not found"}), 404
            
        context = results['documents'][0][:5000]
        prompt = f"Answer based on the paper:\nQuestion: {question}\nContext: {context}"
        
        answer = generate_response(prompt, max_length=200)
        return jsonify({"answer": answer})
        
    except Exception as e:
        logger.error(f"Ask question error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/history', methods=['GET'])
def get_history():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"error": "No user_id provided"}), 400
            
        print(f"Fetching history for user_id: {user_id}")  # Debug log
        
        # Get documents from MongoDB, sorted by timestamp
        documents = list(history_collection.find(
            {"user_id": user_id},
            {"_id": 0}  # Exclude MongoDB _id
        ).sort("timestamp", -1))  # Sort by timestamp descending
        
        print(f"Found {len(documents)} documents")  # Debug log
        
        # Format timestamps for frontend
        for doc in documents:
            if isinstance(doc.get('timestamp'), datetime):
                doc['timestamp'] = doc['timestamp'].isoformat()
                
        return jsonify(documents)
        
    except Exception as e:
        print(f"Error in /history: {str(e)}")  # Debug log
        return jsonify({"error": str(e)}), 500

@app.route('/document/<doc_id>', methods=['GET'])
def get_document_details(doc_id):
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"error": "No user_id provided"}), 400
            
        document = history_collection.find_one(
            {"doc_id": doc_id, "user_id": user_id},
            {"_id": 0}
        )
        
        if not document:
            return jsonify({"error": "Document not found"}), 404
        # Format timestamp for frontend
        if isinstance(document.get('timestamp'), datetime):
            document['timestamp'] = document['timestamp'].isoformat()
            
        return jsonify(document)
        
    except Exception as e:
        print(f"Error in /document/{doc_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/update-account', methods=['POST'])
def update_account():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not all([user_id, current_password, new_password]):
            return jsonify({"error": "Missing required fields"}), 400

        # Verify current user exists and password is correct
        user = users_collection.find_one({"user_id": user_id})
        if not user or not check_password_hash(user['password_hash'], current_password):
            return jsonify({"error": "Invalid credentials"}), 401

        # Update password
        users_collection.update_one(
            {"user_id": user_id},
            {"$set": {"password_hash": generate_password_hash(new_password)}}
        )

        return jsonify({"message": "Account updated successfully"})

    except Exception as e:
        logger.error(f"Update account error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/delete-account', methods=['DELETE'])
def delete_account():
    try:
        data = request.get_json()
        user_id = data.get('user_id')

        if not user_id:
            return jsonify({"error": "User ID required"}), 400

        # Access the global db connection
        users_collection = db['users']
            
        # Delete user's documents from history
        history_collection.delete_many({"user_id": user_id})
        
        # Delete user's documents from ChromaDB
        results = collection.get(
            where={"user_id": user_id},
            include=["metadatas"]
        )
        if results and results['ids']:
            collection.delete(ids=results['ids'])
        
        # Delete user account
        result = users_collection.delete_one({"user_id": user_id})
        
        if result.deleted_count == 0:
            return jsonify({"error": "User not found"}), 404

        return jsonify({"message": "Account deleted successfully"})

    except Exception as e:
        logger.error(f"Delete account error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/summary-progress/<doc_id>', methods=['GET'])
def get_summary_progress(doc_id):
    try:
        doc = history_collection.find_one(
            {"doc_id": doc_id},
            {"status": 1, "progress": 1, "_id": 0}
        )
        if not doc:
            return jsonify({"error": "Document not found"}), 404
            
        return jsonify(doc)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Health check
@app.route('/')
def health_check():
    return jsonify({
        "status": "healthy",
        "services": {
            "chroma": "active",
            "mongo": "active",
            "model": "loaded"
        },
        "endpoints": {
            "/summarize": "POST - Upload document",
            "/generate_summary": "POST - Generate summary",
            "/ask": "POST - Ask questions",
            "/history": "GET - Get document history",
            "/document/<doc_id>": "GET - Document details"
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True)
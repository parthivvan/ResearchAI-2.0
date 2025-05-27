# ResearchAI

AI-powered research paper analysis using RAG (Retrieval-Augmented Generation) with FLAN-T5.

## Installation

1. Clone the repository:
```bash
git clone https://github.com/parthivvan/ResearchAI.git
cd ResearchAI
```

2. Set up Python environment:
```bash
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
pip install torch --index-url https://download.pytorch.org/whl/cu118  # GPU support
```

3. Set up MongoDB:
- Install MongoDB
- Start MongoDB service
- Create database 'researchai'

4. Create required directories:
```bash
mkdir backend-project/uploads
mkdir backend-project/chroma_db
```

5. Install frontend dependencies:
```bash
cd frontend-project
npm install
```

## Running the Application

1. Start backend:
```bash
cd backend-project
python app.py
```

2. Start frontend (in new terminal):
```bash
cd frontend-project
npm start
```

## Features
- Document upload and processing
- AI-powered summarization
- Interactive Q&A
- Advantages/Limitations analysis
- User authentication
- Document history

## Tech Stack
- Frontend: React.js, TailwindCSS
- Backend: Flask, PyTorch
- AI: FLAN-T5, ChromaDB
- Database: MongoDB

## License
MIT License
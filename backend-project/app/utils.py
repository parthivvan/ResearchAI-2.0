import os
import PyPDF2
import docx

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in {'pdf', 'docx'}

def extract_text(filepath, extension):
    if extension == 'pdf':
        with open(filepath, 'rb') as f:
            return ''.join([page.extract_text() for page in PyPDF2.PdfReader(f).pages])
    elif extension == 'docx':
        return '\n'.join([p.text for p in docx.Document(filepath).paragraphs])
    raise ValueError("Unsupported file type")
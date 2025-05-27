import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  DocumentArrowUpIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { toast } from 'react-toastify';

const API_BASE_URL = "http://localhost:5000";

function Home() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail'));
  const [file, setFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleFileUpload = async (event) => {
    try {
      const uploadedFile = event.target.files[0];
      if (!uploadedFile) return;

      if (uploadedFile.size > 10 * 1024 * 1024) {
        toast.error("File size exceeds 10MB limit");
        return;
      }

      const userId = localStorage.getItem('userId');
      if (!userId) {
        toast.error('Please login first');
        return;
      }

      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('user_id', userId);
      setFile(uploadedFile);

      const response = await fetch(`${API_BASE_URL}/summarize`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');

      setDocumentId(data.doc_id);
      setUploadSuccess(true);
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + error.message);
    }
  };

  const handleGenerateSummary = async () => {
    if (!documentId) return;
    
    setIsSummarizing(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/generate_summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doc_id: documentId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate summary");
      }
      
      const data = await response.json();
      
      setSummary({
        text: data.summary,
        advantages: data.advantages || [],
        disadvantages: data.disadvantages || []
      });
      
      setMessages(prevMessages => [
        ...prevMessages, 
        { text: "Summary generated successfully. You can now ask questions about the document.", sender: "bot" }
      ]);
    } catch (error) {
      console.error("Error generating summary:", error);
      setMessages(prevMessages => [
        ...prevMessages,
        { text: `Error: ${error.message || "Failed to generate summary"}`, sender: "bot" }
      ]);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = { text: inputMessage, sender: "user" };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userMessage.text,
          ...(documentId && { doc_id: documentId }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get answer");
      }

      const data = await response.json();
      
      const botMessage = { 
        text: data.answer, 
        sender: "bot" 
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = { 
        text: `Error: ${error.message || "Failed to get response"}`, 
        sender: "bot" 
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
  };

  const downloadSummary = () => {
    if (!summary) return;
    
    // Format the content with summary, advantages, and disadvantages
    const content = `Research Paper Summary
===================

Summary:
${summary.text}

Advantages:
${summary.advantages.map(adv => `• ${adv}`).join('\n')}

Limitations:
${summary.disadvantages.map(dis => `• ${dis}`).join('\n')}
`;

    // Create and download the file
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file?.name.replace(/\.[^/.]+$/, "")}_summary.txt` || "research_summary.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!summary) return;

    const shareContent = `Research Paper Summary

Summary:
${summary.text}

Advantages:
${summary.advantages.map(adv => `• ${adv}`).join('\n')}

Limitations:
${summary.disadvantages.map(dis => `• ${dis}`).join('\n')}`;

    try {
      if (navigator.share) {
        // Use Web Share API if available
        await navigator.share({
          title: `${file?.name || 'Research'} Summary`,
          text: shareContent,
        });
        toast.success('Shared successfully');
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareContent);
        toast.success('Summary copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share summary');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    setUserEmail(null);
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const getFileTypeDisplay = (fileName) => {
    if (!fileName) return null;
    
    const extension = fileName.split('.').pop().toLowerCase();
    
    const fileTypeInfo = {
      pdf: { label: "PDF", bgColor: "bg-red-100", textColor: "text-red-800" },
      docx: { label: "DOCX", bgColor: "bg-blue-100", textColor: "text-blue-800" },
      doc: { label: "DOC", bgColor: "bg-blue-100", textColor: "text-blue-800" },
      txt: { label: "TXT", bgColor: "bg-green-100", textColor: "text-green-800" },
    };
    
    const fileType = fileTypeInfo[extension] || { 
      label: extension.toUpperCase(), 
      bgColor: "bg-gray-100", 
      textColor: "text-gray-800" 
    };
    
    return (
      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${fileType.bgColor} ${fileType.textColor}`}>
        {fileType.label}
      </span>
    );
 
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <BookOpenIcon className="w-8 h-8 text-white" />
            <h1 className="text-2xl font-bold text-white">ResearchAI</h1>
          </Link>
          
          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex space-x-6">
              <Link 
                to="/history" 
                className="text-white hover:text-purple-200 transition-colors flex items-center"
              >
                <ClockIcon className="w-5 h-5 mr-1" />
                History
              </Link>
              <Link 
                to="/settings" 
                className="text-white hover:text-purple-200 transition-colors flex items-center"
              >
                <Cog6ToothIcon className="w-5 h-5 mr-1" />
                Settings
              </Link>
            </nav>
            
            {userEmail ? (
              <div className="flex items-center space-x-4">
                <span className="text-white">{userEmail}</span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-white text-purple-600 px-6 py-2 rounded-full hover:bg-gray-100 shadow-sm transition-all"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
              <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
              Upload Research Paper
            </h2>
            
            {file ? (
              <div className="border border-dark-200 rounded-lg p-4">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 mb-3">
                    <DocumentArrowUpIcon className="w-full h-full text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{file.name}</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                      PDF
                    </span>
                    <span className="text-xs text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="mt-2 text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    Change file
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => fileInputRef.current.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center">
                  <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 mb-1">
                    Click to upload <span className="text-gray-400">or drag and drop</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    PDF, DOCX, TXT (MAX. 10MB)
                  </p>
                </div>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.docx,.doc,.txt"
            />

            {uploadSuccess && !summary && (
              <div className="mt-4">
                <button
                  onClick={handleGenerateSummary}
                  disabled={isSummarizing}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center"
                >
                  {isSummarizing ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2" />
                      Generating Summary...
                    </>
                  ) : (
                    <>
                      <DocumentTextIcon className="w-5 h-5 mr-2" />
                      Generate Summary
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Chat Section */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
            <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-white mr-2" />
                <h2 className="text-xl font-semibold text-white">Paper Assistant</h2>
              </div>
              {file && (
                <span className="bg-indigo-700 text-white text-sm px-3 py-1 rounded-full">
                  {file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}
                </span>
              )}
            </div>

            <div className="flex-1 p-6 overflow-y-auto" style={{ minHeight: '300px', maxHeight: '400px' }}>
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div 
                      key={index} 
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-3/4 rounded-lg px-4 py-2 ${message.sender === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}
                      >
                        {message.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                  <BookOpenIcon className="w-12 h-12 mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-1">No paper uploaded yet</h3>
                  <p className="max-w-md">
                    Upload a research paper to start chatting with the assistant.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={file ? "Ask about the paper..." : "Upload a paper to ask questions"}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  disabled={!file}
                />
                <button 
                  type="submit"
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition duration-300 flex items-center justify-center"
                  disabled={!file || !inputMessage.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
        {/* Summary Section */}
        <div className="lg:col-span-2">
          {summary ? (
            <div className="bg-white rounded-xl shadow-md p-6 h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <BookOpenIcon className="w-5 h-5 mr-2" />
                  Research Summary
                </h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={downloadSummary}
                    className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-full"
                    title="Download summary"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleShare}
                    className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-full"
                    title="Share summary"
                  >
                    <ShareIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="prose prose-sm max-w-none">
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <p className="text-gray-700 text-lg">{summary.text}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h3 className="font-medium text-green-800 text-lg mb-3">Advantages</h3>
                    <ul className="text-green-700 space-y-2 text-md">
                      {summary.advantages.map((item, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-2">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-red-50 p-6 rounded-lg">
                    <h3 className="font-medium text-red-800 text-lg mb-3">Limitations</h3>
                    <ul className="text-red-700 space-y-2 text-md">
                      {summary.disadvantages.map((item, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-2">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-12 text-center h-full flex flex-col items-center justify-center">
              <DocumentArrowUpIcon className="w-16 h-16 text-gray-300 mb-6" />
              <h3 className="text-xl font-medium text-gray-500 mb-2">No summary available</h3>
              <p className="text-gray-400 max-w-md">
                Upload a research paper to generate a detailed summary with advantages and limitations.
              </p>
            </div>
          )}
        </div>
      </main>
      {/* Features Section */}
      <section className="bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Powerful Features for Researchers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl shadow-sm hover:shadow-md transition duration-300">
              <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <BookOpenIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">RAG Model Processing</h3>
              <p className="text-gray-600">
                Advanced document processing using Retrieval-Augmented Generation with T5 Architecture and ChromaDB.
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-xl shadow-sm hover:shadow-md transition duration-300">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Smart Summarization</h3>
              <p className="text-gray-600">
                Get concise summaries with key advantages and limitations highlighted.
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl shadow-sm hover:shadow-md transition duration-300">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Interactive Q&A</h3>
              <p className="text-gray-600">
                Ask specific questions about the paper and get accurate responses.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">ResearchAI</h3>
              <p className="text-gray-400">
                Advanced research paper summarization using RAG and Transformer models.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Document Summarization</li>
                <li>Interactive Q&A</li>
                <li>Advantages/Limitations</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Technology</h3>
              <ul className="space-y-2 text-gray-400">
                <li>RAG Model</li>
                <li>Flan T5 Transformers</li>
                <li>ChromaDB</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>parthivvanapalli@researchai.com</li>
                <li>7981613515</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>© 2025 ResearchAI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
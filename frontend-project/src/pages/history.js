import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import {
  BookOpenIcon,
  ClockIcon,
  DocumentTextIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import 'react-toastify/dist/ReactToastify.css';

const API_BASE_URL = "http://localhost:5000";

function History() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (!userId) {
      toast.error('Please login to view history');
      navigate('/login');
      return;
    }
    fetchDocuments();
  }, [userId, navigate]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/history?user_id=${userId}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      console.log('Fetched documents:', data); // Debug log
      setDocuments(data);
    } catch (error) {
      console.error('History fetch error:', error);
      setError(error.message);
      toast.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocumentDetails = async (docId) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/document/${docId}?user_id=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch document details');
      }

      const data = await response.json();
      setSelectedDoc(data);
    } catch (error) {
      console.error('Detail fetch error:', error);
      toast.error('Failed to load document details');
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => setSelectedDoc(null);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-96 text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to view your history</h2>
          <Link to="/login" className="text-indigo-600 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <BookOpenIcon className="w-8 h-8 text-white" />
            <h1 className="text-2xl font-bold text-white">ResearchAI</h1>
          </Link>
          <div className="flex items-center space-x-6">
            <Link
              to="/"
              className="text-white hover:text-purple-200 transition-colors flex items-center"
            >
              <DocumentTextIcon className="w-5 h-5 mr-1" />
              Home
            </Link>
            <Link
              to="/login"
              className="bg-white text-purple-600 px-6 py-2 rounded-full hover:bg-gray-100 shadow-sm transition-all"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
            <ClockIcon className="w-5 h-5 mr-2" />
            Document History
          </h2>

          {isLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin h-10 w-10 border-t-2 border-b-2 border-indigo-600 rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-600 mb-2">{error}</p>
              <button
                onClick={fetchDocuments}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Try Again
              </button>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 mb-2">No documents found</p>
              <Link
                to="/"
                className="text-indigo-600 hover:text-indigo-800"
              >
                Upload a Document
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.doc_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doc.filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(doc.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.status}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => fetchDocumentDetails(doc.doc_id)}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  Summary for {selectedDoc.filename}
                </h3>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="prose prose-sm max-w-none">
                {selectedDoc.summary ? (
                  <>
                    <div className="bg-gray-50 p-6 rounded-lg mb-6">
                      <p className="text-gray-700 text-lg">{selectedDoc.summary}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-green-50 p-6 rounded-lg">
                        <h4 className="font-medium text-green-800 text-lg mb-3">Advantages</h4>
                        <ul className="text-green-700 space-y-2 text-md">
                          {selectedDoc.advantages && selectedDoc.advantages.length > 0 ? (
                            selectedDoc.advantages.map((item, i) => (
                              <li key={i} className="flex items-start">
                                <span className="mr-2">•</span> {item}
                              </li>
                            ))
                          ) : (
                            <li>No advantages listed</li>
                          )}
                        </ul>
                      </div>
                      <div className="bg-red-50 p-6 rounded-lg">
                        <h4 className="font-medium text-red-800 text-lg mb-3">Limitations</h4>
                        <ul className="text-red-700 space-y-2 text-md">
                          {selectedDoc.disadvantages && selectedDoc.disadvantages.length > 0 ? (
                            selectedDoc.disadvantages.map((item, i) => (
                              <li key={i} className="flex items-start">
                                <span className="mr-2">•</span> {item}
                              </li>
                            ))
                          ) : (
                            <li>No limitations listed</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500">Summary not available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default History;
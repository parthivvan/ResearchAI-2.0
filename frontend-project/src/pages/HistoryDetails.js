import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  BookOpenIcon, 
  ClockIcon, 
  DocumentTextIcon,
  ArrowDownTrayIcon 
} from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config';

function HistoryDetails() {
  const { doc_id } = useParams();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummaryDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/document/${doc_id}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch summary details');
        }
        const data = await response.json();
        setSummary(data);
      } catch (err) {
        console.error('Error fetching summary details:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummaryDetails();
  }, [doc_id]);

  const downloadSummary = () => {
    const blob = new Blob([summary.summary], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${summary.filename}_summary.txt`;
    link.click();
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
            <Link
              to="/History"
              className="text-white hover:text-purple-200 transition-colors flex items-center"
            >
              <ClockIcon className="w-5 h-5 mr-1" />
              History
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
            <DocumentTextIcon className="w-5 h-5 mr-2" />
            Summary Details
          </h2>
          {isLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading summary...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-600">
              <p>Error: {error}</p>
              <Link to="/History" className="mt-2 inline-block text-indigo-600 hover:text-indigo-800">
                Back to History
              </Link>
            </div>
          ) : summary ? (
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-medium mb-4">Summary for {summary.filename}</h3>
              {summary.summary ? (
                <>
                  <div className="bg-gray-50 p-6 rounded-lg mb-6">
                    <p className="text-gray-700 text-lg">{summary.summary}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-green-50 p-6 rounded-lg">
                      <h4 className="font-medium text-green-800 text-lg mb-3">Advantages</h4>
                      <ul className="text-green-700 space-y-2 text-md">
                        {summary.advantages && summary.advantages.length > 0 ? (
                          summary.advantages.map((item, i) => (
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
                        {summary.disadvantages && summary.disadvantages.length > 0 ? (
                          summary.disadvantages.map((item, i) => (
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
              <button
                onClick={downloadSummary}
                className="mt-4 inline-flex items-center bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
              >
                <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                Download Summary
              </button>
              <Link
                to="/History"
                className="mt-4 inline-block text-indigo-600 hover:text-indigo-800"
              >
                Back to History
              </Link>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <p>No summary found.</p>
              <Link to="/History" className="mt-2 inline-block text-indigo-600 hover:text-indigo-800">
                Back to History
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
export default HistoryDetails;
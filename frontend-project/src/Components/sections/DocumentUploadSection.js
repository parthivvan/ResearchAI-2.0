import React, { useState, useEffect } from "react";
import {
  DocumentArrowUpIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  ExclamationCircleIcon
} from "@heroicons/react/24/outline"; // Removed CheckCircleIcon
import { API_BASE_URL } from "../../config";

export function DocumentUploadSection({
  file,
  isProcessing,
  fileInputRef,
  handleFileUpload,
  handleDragOver,
  handleDrop,
  getFileTypeDisplay,
  setFile,
  setSummary,
  setMessages,
  setDocumentId,
  setUploadSuccess,
  uploadSuccess,
  summary,
  handleGenerateSummary,
  isSummarizing,
  documentId
}) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  useEffect(() => {
    let interval;
    if (isSummarizing) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/summary-progress/${documentId}`);
          const data = await response.json();
          
          if (data.status === 'completed') {
            clearInterval(interval);
            setProgress(100);
            setStatus('completed');
          } else if (data.status === 'failed') {
            clearInterval(interval);
            setStatus('failed');
            // setError(data.error); - Remove since we're not using error state
          } else {
            setProgress(data.progress || 0);
            setStatus(data.status);
          }
        } catch (error) {
          console.error('Progress check failed:', error);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSummarizing, documentId]);

  const renderProgressState = () => {
    if (status === 'failed') {
      return (
        <div className="text-red-600 flex items-center">
          <ExclamationCircleIcon className="w-5 h-5 mr-2" />
          Generation failed. Please try again.
        </div>
      );
    }

    const steps = [
      { label: 'Initializing...', progress: 0 },
      { label: 'Analyzing document...', progress: 25 },
      { label: 'Generating summary...', progress: 50 },
      { label: 'Extracting key points...', progress: 75 },
      { label: 'Finalizing...', progress: 90 },
    ];

    const currentStep = steps.find(step => progress <= step.progress) || steps[steps.length - 1];

    return (
      <div className="flex flex-col items-center w-full">
        <div className="flex items-center mb-2">
          <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2" />
          {currentStep.label}
        </div>
        <div className="w-full bg-indigo-800 rounded-full h-2 mb-2">
          <div 
            className="bg-white h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-sm flex items-center">
          <ClockIcon className="w-4 h-4 mr-1" />
          Progress: {progress}%
        </div>
      </div>
    );
  };

  const renderFileSize = (size) => {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center mb-4">
        <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
        <h2 className="text-xl font-semibold text-gray-800">Upload Research Paper</h2>
      </div>

      {file ? (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 mb-3">
              <img src="/document-icon.svg" alt="Document" className="w-full h-full" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">{file.name}</p>
              <div className="mt-2 flex items-center justify-center space-x-2">
                <span className="text-sm bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                  {file.name.split('.').pop().toUpperCase()}
                </span>
                <span className="text-sm text-gray-500">
                  {renderFileSize(file.size)}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current.click();
                }}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 underline"
              >
                Change file
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => fileInputRef.current.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <ArrowUpTrayIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="mb-1 text-sm text-gray-900">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">PDF, DOCX, TXT (MAX. 10MB)</p>
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
            {isSummarizing ? renderProgressState() : (
              <>
                <DocumentTextIcon className="w-5 h-5 mr-2" />
                Generate Summary
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
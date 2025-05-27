import React from "react";
import { BookOpenIcon, ArrowDownTrayIcon, ShareIcon, DocumentArrowUpIcon } from "@heroicons/react/24/outline";

export function SummarySection({ summary, downloadSummary }) {
  return summary ? (
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
  );
}
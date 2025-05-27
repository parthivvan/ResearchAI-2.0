import React, { useRef, useEffect } from "react";
import { ChatBubbleLeftRightIcon, BookOpenIcon } from "@heroicons/react/24/outline";

export function ChatSection({
  messages,
  inputMessage,
  setInputMessage,
  handleSendMessage,
  file,
  chatEndRef
}) {
  useEffect(() => {
    if (chatEndRef && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatEndRef]);

  return (
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
  );
}
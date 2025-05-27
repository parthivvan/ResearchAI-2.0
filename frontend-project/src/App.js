import React, { useState, useRef, useEffect } from "react";
import Home from "./pages/Home";
import Login from "./pages/login";
import Signup from "./pages/signup";
import { DocumentUploadSection } from "./Components/sections/DocumentUploadSection";
import { ChatSection } from "./Components/sections/ChatSection";
import { SummarySection } from "./Components/sections/SummarySection";
import History from "./pages/history";
import HistoryDetails from "./pages/HistoryDetails";
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link,
  useParams 
} from "react-router-dom";
import {
  DocumentArrowUpIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import Settings from "./pages/Settings";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_BASE_URL = "http://localhost:5000";


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:doc_id" element={<HistoryDetails />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}
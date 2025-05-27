import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import {
  BookOpenIcon,
  ClockIcon,
  DocumentTextIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Cog6ToothIcon } from "@heroicons/react/24/solid";

const API_BASE_URL = "http://localhost:5000";

function Settings() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [notifications, setNotifications] = useState(localStorage.getItem('notifications') === 'true');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      toast.error('Please login first');
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const handleUpdateAccount = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch(`${API_BASE_URL}/update-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: localStorage.getItem('userId'),
          current_password: password,
          new_password: newPassword
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success('Account updated successfully');
      setPassword('');
      setNewPassword('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePreferenceChange = (type, value) => {
    if (type === 'darkMode') {
      setDarkMode(value);
      localStorage.setItem('darkMode', value);
      document.documentElement.classList.toggle('dark', value);
    } else if (type === 'notifications') {
      setNotifications(value);
      localStorage.setItem('notifications', value);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: localStorage.getItem('userId')
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      localStorage.clear();
      toast.success('Account deleted successfully');
      navigate('/signup');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <BookOpenIcon className="w-8 h-8 text-white" />
            <h1 className="text-2xl font-bold text-white">ResearchAI</h1>
          </Link>
          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex space-x-6">
              <Link to="/history" className="text-white hover:text-purple-200 transition-colors flex items-center">
                <ClockIcon className="w-5 h-5 mr-1" />
                History
              </Link>
              <Link to="/settings" className="text-white hover:text-purple-200 transition-colors flex items-center">
                <Cog6ToothIcon className="w-5 h-5 mr-1" />
                Settings
              </Link>
            </nav>
            <Link to="/login" className="bg-white text-purple-600 px-6 py-2 rounded-full hover:bg-gray-100 shadow-sm transition-all">
              Login
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Settings</h1>
          
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Account</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={userEmail}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-100 dark:bg-gray-700 dark:text-white"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter new password"
                  />
                </div>
                <button 
                  onClick={handleUpdateAccount}
                  disabled={isUpdating || !password || !newPassword}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-300 disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : 'Update Account'}
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="dark-mode"
                    checked={darkMode}
                    onChange={(e) => handlePreferenceChange('darkMode', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="dark-mode" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Dark Mode
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="notifications"
                    checked={notifications}
                    onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Email Notifications
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Danger Zone</h2>
              <div className="space-y-4">
                {!showDeleteConfirm ? (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-red-500 font-medium">Are you sure? This cannot be undone.</p>
                    <div className="flex space-x-4">
                      <button 
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300"
                      >
                        Yes, Delete My Account
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition duration-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Warning: This action cannot be undone. All your data will be permanently deleted.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Settings;
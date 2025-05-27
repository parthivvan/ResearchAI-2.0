import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  LockClosedIcon, 
  EnvelopeIcon, 
  UserIcon,
  ArrowLeftIcon 
} from "@heroicons/react/24/solid";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
  
    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
  
    try {
      const response = await fetch("http://localhost:5000/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        localStorage.setItem("userId", data.user_id);
        alert("Account created successfully! Redirecting to Home...");
        navigate("/");
      } else {
        alert(data.error || "Signup failed. Please try again.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("Something went wrong. Please try again.");
    }
  };
  
  


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 animate-gradient">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-96 transform transition-all duration-500 hover:scale-105">
        <div className="flex items-center mb-6">
          <Link to="/login" className="mr-2 text-gray-500 hover:text-indigo-600">
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500">
            Create Account
          </h2>
        </div>
        
        <form onSubmit={handleSignup}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Full Name</label>
            <div className="flex items-center border rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-purple-500">
              <UserIcon className="w-5 h-5 text-gray-400 ml-3" />
              <input
                type="text"
                className="w-full px-3 py-2 bg-transparent focus:outline-none"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Email</label>
            <div className="flex items-center border rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-purple-500">
              <EnvelopeIcon className="w-5 h-5 text-gray-400 ml-3" />
              <input
                type="email"
                className="w-full px-3 py-2 bg-transparent focus:outline-none"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Password</label>
            <div className="flex items-center border rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-purple-500">
              <LockClosedIcon className="w-5 h-5 text-gray-400 ml-3" />
              <input
                type="password"
                className="w-full px-3 py-2 bg-transparent focus:outline-none"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="6"
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Confirm Password</label>
            <div className="flex items-center border rounded-lg bg-gray-50 focus-within:ring-2 focus-within:ring-purple-500">
              <LockClosedIcon className="w-5 h-5 text-gray-400 ml-3" />
              <input
                type="password"
                className="w-full px-3 py-2 bg-transparent focus:outline-none"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength="6"
              />
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-2 rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all duration-300 mb-4"
          >
            Sign Up
          </button>
          
          <p className="text-center text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-purple-600 hover:underline">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
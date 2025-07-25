'use client';

import React, { useState } from 'react';
import Link from 'next/link'; // Import Link for client-side navigation
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  // State to hold email and password input values
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null); // To display error messages
  const [loading, setLoading] = useState<boolean>(false); // To show loading state during API call

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior (page reload)
    setError(null);    // Clear previous errors
    setLoading(true);  // Set loading to true

    try {
        const res=await fetch('http://localhost:5000/api/auth/login',{
            method:'POST',
            headers : {
                'Content-Type' : 'application/json',
            },
            body: JSON.stringify({email,password}),
        });

        const data = await res.json();

        if (!res.ok) {
            setError(data.msg || data.errors?.[0]?.msg || 'Login failed. Please try again.');
            return;
        }
        login(data.token, data.user);
    } catch (err: any) {
        console.error("Login fetch error:", err);
        setError('Network error or server unavailable. Please check your connection.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>

        {/* Display error message if present */}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
            <input
              type="email"
              id="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Password:</label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            disabled={loading} // Disable button when loading
          >
            {loading ? 'Logging In...' : 'Login'}
          </button>
        </form>

        {/* Link to Signup page (will create this in a later step) */}
        <p className="text-center text-gray-600 text-sm mt-4">
          Don't have an account? <a href="/signup" className="text-blue-500 hover:underline">Sign Up</a>
        </p>
      </div>
    </div>
  );
}

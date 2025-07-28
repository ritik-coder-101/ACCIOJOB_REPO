// app/page.tsx
'use client'; // Mark as client component as it uses hooks for auth and routing

import React, { useEffect } from 'react';
import Link from 'next/link'; // For client-side navigation
import { useAuth } from '../context/AuthContext'; // To check authentication status
import { useRouter } from 'next/navigation'; // For programmatic redirect

export default function LandingPage() {
  const { user, loading: authLoading } = useAuth(); // Get user status from auth context
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && user) { // If not loading auth status, and user is logged in
      router.replace('/dashboard'); // Redirect to dashboard
    }
  }, [user, authLoading, router]); // Dependency array

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-700">Loading...</p>
      </div>
    );
  }

  // Only render landing page if not authenticated and not loading
  if (user) { // If user is logged in, useEffect will handle redirect. This prevents flicker.
    return null; // Don't render the landing page if user is logged in
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white p-4">
      <h1 className="text-5xl md:text-7xl font-extrabold mb-6 text-center leading-tight">
        Welcome to AI Playground!
      </h1>
      <p className="text-lg md:text-xl text-center mb-10 max-w-2xl opacity-90">
        Generate, preview, and refine React components (or full pages) with the power of AI.
      </p>

      <div className="flex space-x-4">
        <Link href="/signup">
          <button className="bg-white text-blue-600 hover:bg-blue-100 font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105 shadow-lg">
            Sign Up
          </button>
        </Link>
        <Link href="/login">
          <button className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-purple-600 font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105 shadow-lg">
            Login
          </button>
        </Link>
      </div>

      <p className="text-xs mt-10 opacity-70">
        Built with Next.js, Node.js, MongoDB Atlas, and Google Gemini AI.
      </p>
    </div>
  );
}
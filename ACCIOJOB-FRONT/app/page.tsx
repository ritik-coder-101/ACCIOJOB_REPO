// app/page.tsx
'use client'; 

import React, { useEffect } from 'react';
import Link from 'next/link'; 
import { useAuth } from '../context/AuthContext'; 
import { useRouter } from 'next/navigation'; 

export default function LandingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) { 
      router.replace('/dashboard'); 
    }
  }, [user, authLoading, router]); 

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-700">Loading...</p>
      </div>
    );
  }

  if (user) { 
    return null; 
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
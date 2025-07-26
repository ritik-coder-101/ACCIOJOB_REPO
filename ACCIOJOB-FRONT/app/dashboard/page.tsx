// app/dashboard/page.tsx
'use client'; // This directive marks this as a Client Component in Next.js

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext'; // Import the useAuth hook for auth state
import { useRouter } from 'next/navigation'; // Import useRouter hook for redirects
import LivePreviewModal from '../../components/LivePreviewModal'; // Import the LivePreviewModal component

// Define an interface for the session data for type safety
// This reflects the shape of the data returned by your backend's session API.
interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  // These fields are populated when a specific session is loaded (e.g., from GET /api/sessions/:id)
  chat_history?: { // Array of chat messages
    role: 'user' | 'ai'; // Role of the message sender
    content: string;     // The text content of the message
    code_snippet?: { jsx: string; css: string; html:string }; // Optional code snippet for AI responses
  }[];
  generated_code?: { jsx: string; css: string;html:string }; // The full generated component code
  ui_editor_state?: any; // State for interactive UI editor (e.g., properties of selected elements)
}

// Main DashboardPage component
export default function DashboardPage() {
  // Destructure authentication state and functions from AuthContext
  const { user, token, logout, loading: authLoading } = useAuth();
  const router = useRouter(); // Initialize router for programmatic redirects

  // State for managing the list of all sessions for the current user
  const [sessions, setSessions] = useState<Session[]>([]);
  // State for storing the currently selected/loaded session's full details
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Loading states for different asynchronous operations
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(true); // For loading the list of sessions
  const [sessionDetailLoading, setSessionDetailLoading] = useState<boolean>(false); // For loading/creating a specific session
  const [error, setError] = useState<string | null>(null); // For displaying error messages

  // State for the user's chat input
  const [promptInput, setPromptInput] = useState<string>('');

  // Ref for auto-scrolling to the end of the chat messages
  const chatEndRef = useRef<HTMLDivElement>(null);

  // States for modal control
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [codeToDisplayInModal, setCodeToDisplayInModal] = useState<{ jsx: string; css: string } | null>(null);

  // -------------------------------------------------------------------
  // ALL useEffect hooks MUST be declared here, unconditionally, before any conditional returns
  // -------------------------------------------------------------------

  // Effect 1: Client-side route protection
  // Redirects unauthenticated users to the login page.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Effect 2: Fetch list of sessions when user/token changes (i.e., on login/initial load)
  useEffect(() => {
    // Only attempt to fetch sessions if a user is authenticated and a token is available.
    if (user && token) {
      const fetchSessions = async () => {
        setSessionsLoading(true);
        setError(null);

        try {
          const res = await fetch('http://localhost:5000/api/sessions', {
            method: 'GET',
            headers: {
              'x-auth-token': token,
              'Content-Type': 'application/json',
            },
          });

          const data = await res.json();

          if (!res.ok) {
            const errorMessage = data.msg || 'Failed to fetch sessions.';
            throw new Error(errorMessage);
          }

          setSessions(data);

          // Optional: If there are sessions and none is selected, load the most recent one automatically
          if (data.length > 0 && selectedSession === null) {
              await handleLoadSession(data[0].id);
          }

        } catch (err: any) {
          console.error("Error fetching sessions:", err);
          setError(err.message || 'Could not load sessions.');
          if (err.message === 'No token, authorization denied' || err.message === 'Token is not valid') {
              logout();
          }
        } finally {
          setSessionsLoading(false);
        }
      };

      fetchSessions();
    }
  }, [user, token, logout]); // Corrected dependencies: removed selectedSession from this effect

  // Effect 3: Auto-scroll to the bottom of the chat (runs when chat history length changes)
  useEffect(() => {
    if (chatEndRef.current) {
      // Use a small setTimeout to ensure DOM has updated before scrolling
      const timer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'instant' }); // Changed to 'instant' and 0ms timeout
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [selectedSession?.chat_history?.length, sessionDetailLoading]);

  // -------------------------------------------------------------------
  // All handler functions must be declared AFTER hooks, but before conditional returns
  // -------------------------------------------------------------------

  // Function to handle creating a new design session
  const handleCreateNewSession = async () => {
    if (!token) {
      setError('Not authenticated. Please log in.');
      return;
    }

    setSessionDetailLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:5000/api/sessions/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.msg || 'Failed to create new session.';
        throw new Error(errorMessage);
      }

      const newSessionData: Session = {
        id: data.sessionId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        chat_history: [],
        generated_code: {
          jsx: '',
          css: ''
        },
        ui_editor_state: {},
      };

      setSessions((prevSessions) => [newSessionData, ...prevSessions]);
      await handleLoadSession(newSessionData.id);

    } catch (err: any) {
      console.error("Error creating new session:", err);
      setError(err.message || 'Could not create new session.');
      if (err.message === 'No token, authorization denied' || err.message === 'Token is not valid') {
        logout();
      }
    } finally {
      setSessionDetailLoading(false);
    }
  };

  // Function to handle loading a specific session's details when selected from the list
  const handleLoadSession = async (sessionId: string) => {
    if (!token) {
      setError('Not authenticated. Please log in.');
      return;
    }

    setSessionDetailLoading(true);
    setError(null);

    try {
      const res = await fetch(`http://localhost:5000/api/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.msg || 'Failed to load session.';
        throw new Error(errorMessage);
      }

      setSelectedSession(data);

    } catch (err: any) {
      console.error("Error loading session:", err);
      setError(err.message || 'Could not load session details.');
      if (err.message === 'No token, authorization denied' || err.message === 'Token is not valid' || err.message === 'Session not found or not authorized') {
        logout();
      }
    } finally {
      setSessionDetailLoading(false);
    }
  };

  // Function to handle sending a prompt to the AI
  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || !selectedSession || !token) {
      setError('Please select a session and enter a prompt.');
      return;
    }

    const userMessage = { role: 'user', content: promptInput };
    const currentSessionId = selectedSession.id;

    // Optimistically update UI with user's message
    setSelectedSession((prevSession) => {
      if (!prevSession) return null;
      return {
        ...prevSession,
        chat_history: [...(prevSession.chat_history || []), userMessage],
      };
    });
    setPromptInput('');

    setSessionDetailLoading(true);
    setError(null);

    try {
      const aiResponseThinking = {
        role: 'ai',
        content: 'Thinking...',
        code_snippet: undefined,
      };

      setSelectedSession((prevSession) => {
        if (!prevSession) return null;
        return {
          ...prevSession,
          chat_history: [...(prevSession.chat_history || []), aiResponseThinking],
        };
      });

      // --- ACTUAL AI BACKEND CALL ---
      const aiRes = await fetch('http://localhost:5000/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({ prompt: userMessage.content }),
      });

      const aiData = await aiRes.json();

      if (!aiRes.ok) {
        const aiErrorMessage = aiData.msg || 'AI response failed.';
        throw new Error(aiErrorMessage);
      }

      const finalAiResponse = {
        role: 'ai',
        content: aiData.aiText,
        code_snippet: aiData.generatedCode,
      };

      setSelectedSession((prevSession) => {
        if (!prevSession) return null;
        const updatedChatHistory = [...(prevSession.chat_history || [])];
        updatedChatHistory[updatedChatHistory.length - 1] = finalAiResponse;
        return {
          ...prevSession,
          chat_history: updatedChatHistory,
          generated_code: finalAiResponse.code_snippet,
        };
      });

      const chatHistoryForSave = [...(selectedSession?.chat_history || []), userMessage, finalAiResponse];

      const sessionToSave = {
        chat_history: chatHistoryForSave,
        generated_code: finalAiResponse.code_snippet,
        ui_editor_state: selectedSession?.ui_editor_state || {},
      };

      const saveRes = await fetch(`http://localhost:5000/api/sessions/${currentSessionId}/save`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(sessionToSave),
      });

      if (!saveRes.ok) {
        const saveErrorData = await saveRes.json();
        throw new Error(saveErrorData.msg || 'Failed to auto-save session.');
      }
      console.log('Session auto-saved successfully!');

    } catch (err: any) {
      console.error("Error sending prompt or saving session:", err);
      setError(err.message || 'Error processing prompt. Please try again.');
      if (err.message === 'No token, authorization denied' || err.message === 'Token is not valid') {
        logout();
      }
    } finally {
      setSessionDetailLoading(false);
    }
  };


  // -------------------------------------------------------------------
  // Conditional rendering based on authentication and loading states
  // These MUST come AFTER all hook declarations.
  // -------------------------------------------------------------------

  // Display a loading message while authentication status is being determined by AuthContext
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-700">Loading user authentication...</p>
      </div>
    );
  }

  // If user is null after authentication check, redirect already handled by useEffect.
  // This block acts as a temporary display before the redirect fully occurs.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-red-500">Access Denied. Redirecting to login...</p>
      </div>
    );
  }

  // --- DEBUGGING LOG (You can remove this after confirming display) ---
  console.log('Current selectedSession:', selectedSession);
  // --- END DEBUGGING LOG ---

  // -------------------------------------------------------------------
  // Main Dashboard UI for authenticated users (JSX return)
  // -------------------------------------------------------------------
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel: Sessions List & User Info */}
      <div className="w-1/4 p-4 bg-white border-r border-gray-200 shadow-md flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Welcome, {user.email}!</h2>

        {/* "Create New Session" button */}
        <button
          onClick={handleCreateNewSession} // Connects to the function for creating new sessions
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4 w-full"
          disabled={sessionDetailLoading} // Disable button if a session operation is in progress
        >
          {sessionDetailLoading && selectedSession === null ? 'Creating Session...' : 'Create New Session'}
        </button>

        <h3 className="text-lg font-semibold mb-2 text-gray-700">Your Sessions:</h3>
        {error && <p className="text-red-500 mb-2">{error}</p>} {/* Display any session-related errors */}
        {sessionsLoading ? (
          <p className="text-gray-500">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-gray-500">No sessions yet. Create one to start!</p>
        ) : (
          // List of existing sessions
          <ul className="overflow-y-auto flex-grow border rounded p-2 bg-gray-100">
            {sessions.map((session) => (
              <li
                key={session.id}
                onClick={() => handleLoadSession(session.id)} // Make list item clickable to load session details
                className={`p-3 mb-2 rounded cursor-pointer ${
                  selectedSession?.id === session.id ? 'bg-blue-100 border-blue-500 border' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <p className="font-medium text-blue-800">Session: {new Date(session.createdAt).toLocaleString()}</p>
                <p className="text-sm text-gray-600">Last updated: {new Date(session.updatedAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}

        {/* Logout Button */}
        <button
          onClick={logout} // Connects to the logout function from AuthContext
          className="mt-auto bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-full"
        >
          Logout
        </button>
      </div>

      {/* Right Panel: Main Playground / Session Details */}
      <div className="flex-grow p-4 bg-gray-100 flex flex-col">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Component Playground</h2>
        {/* Conditional rendering for loading state or no session selected */}
        {sessionDetailLoading && selectedSession !== null ? (
          <p className="text-center text-lg mt-10 text-gray-700">Loading session details...</p>
        ) : selectedSession ? (
          // Display details if a session is selected
          <div className="bg-white p-6 rounded shadow-md flex-grow border border-blue-200 flex flex-col">
            <p className="text-gray-700 mb-2">Session ID: <span className="font-mono text-sm">{selectedSession.id}</span></p>

            {/* Displaying actual loaded data - Chat Transcript only for now */}
            <div className="flex-grow overflow-hidden flex flex-col">
                {/* Enhanced chat display container with scrolling */}
                <div className="space-y-3 w-full overflow-y-auto max-h-[calc(100vh-250px)] pr-2 bg-gray-200 rounded p-2">
                    {/* Check if chat_history exists and has items before mapping */}
                    {selectedSession.chat_history?.length > 0 ? (
                        selectedSession.chat_history.map((message: any, index: number) => (
                            <div
                                key={index}
                                // Align message based on role (user right, AI left)
                                className={`flex ${
                                    message.role === 'user' ? 'justify-end' : 'justify-start'
                                } w-full`}
                            >
                                {/* The actual message bubble with styling and overflow handling */}
                                <div
                                    className={`rounded-lg p-3 shadow-md ${
                                        message.role === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-300 text-gray-800'
                                    } ${
                                        // Dynamic max-width for bubbles based on content type
                                        message.code_snippet
                                            ? 'max-w-[calc(100%-2rem)]'
                                            : 'max-w-[75%]'
                                    } overflow-x-hidden break-words flex-shrink-0`}
                                >
                                    <strong className="block capitalize mb-1">{message.role}:</strong>
                                    <p className="text-sm">{message.content}</p>
                                    {/* Display code snippet if available */}
                                    {message.code_snippet && (
                                        <> {/* Fragment is needed to group <pre> and <button> */}
                                            <pre className="mt-2 p-2 bg-gray-700 text-white rounded text-xs overflow-x-auto whitespace-pre w-full box-border">
                                                {/* Display JSX and CSS content directly with newlines */}
                                                {message.code_snippet.jsx && (
                                                    <>
                                                        <span className="font-bold text-blue-300">JSX:</span>
                                                        {'\n'}
                                                        <code>{message.code_snippet.jsx}</code>
                                                        {'\n\n'}
                                                    </>
                                                )}
                                                {message.code_snippet.css && (
                                                    <>
                                                        <span className="font-bold text-green-300">CSS:</span>
                                                        {'\n'}
                                                        <code>{message.code_snippet.css}</code>
                                                        {'\n\n'}
                                                    </>
                                                )}
                                                {message.code_snippet.html && (
                                                    <>
                                                        <span className="font-bold text-green-300">HTML:</span>
                                                        {'\n'}
                                                        <code>{message.code_snippet.html}</code>
                                                    </>
                                                )}
                                            </pre>
                                            {/* --- Per-Message Render Button --- */}
                                            <button
                                              onClick={() => {
                                                setCodeToDisplayInModal(message.code_snippet); // Set the specific code
                                                setIsModalOpen(true); // Open the modal
                                              }}
                                              className="mt-2  py-1.5 px-1 rounded-lg font-bold transition-colors bg-orange-600 hover:bg-orange-700 text-white text-sm"
                                            >
                                              Render This Version
                                            </button>
                                            {/* ------------------------------------ */}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-600 text-center py-4">No chat history for this session yet.</p>
                    )}
                    {/* Element to scroll to (for auto-scrolling) */}
                    <div ref={chatEndRef} />
                </div>
            </div>
            {/* Chat Input Section */}
            <form onSubmit={handleSendPrompt} className="mt-4 flex gap-2 mt-auto">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Type your prompt here..."
                className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-font-bold text-gray-800 h-10"
                disabled={sessionDetailLoading}
              />
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
                disabled={sessionDetailLoading || !promptInput.trim()}
              >
                Send
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center text-gray-600 text-lg">
            <p>Select a session from the left or create a new one to begin.</p>
          </div>
        )}
      </div>
      <LivePreviewModal
        show={isModalOpen} // Controls modal visibility
        onClose={() => {
          setIsModalOpen(false); // Close function
          setCodeToDisplayInModal(null); // Clear code when modal closes
        }}
        codeToRender={codeToDisplayInModal} // Pass the specific code snippet to the modal
      />
    </div>
  );
}
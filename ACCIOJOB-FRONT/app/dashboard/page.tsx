// app/dashboard/page.tsx
'use client'; // This directive marks this as a Client Component in Next.js

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext'; // Import the useAuth hook for auth state
import { useRouter } from 'next/navigation'; // Import useRouter hook for redirects
import LivePreviewModal from '../../components/LivePreviewModal'; // Import the LivePreviewModal component
import router from 'next/router';


interface BaseChatMessage {
  role: 'user' | 'ai';
  content: string;
}

interface TextMessage extends BaseChatMessage {
  imageUrl?: undefined;   // Explicitly undefined for text messages
  code_snippet?: undefined; // Explicitly undefined for text messages
}

interface ImageMessage extends BaseChatMessage {
  imageUrl: string; // Image message must have an imageUrl
  code_snippet?: undefined; // Explicitly undefined for image messages
}

interface CodeMessage extends BaseChatMessage {
  code_snippet: { jsx?: string; css?: string; html?: string }; // Code message must have a code_snippet
  imageUrl?: undefined; // Explicitly undefined for code messages
}

interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  chat_history?: { // Array of chat messages
    role?: 'user' | 'ai'; // Role of the message sender
    content?: string;
    imageUrl?:string;     // The text content of the message
    code_snippet?: { jsx?: string; css?: string; html?:string }; // Optional code snippet for AI responses
  }[];
  generated_code?: { jsx?: string; css?: string;html?:string }; // The full generated component code
  ui_editor_state?: any; // State for interactive UI editor (e.g., properties of selected elements)
}

// Main DashboardPage component
export default function DashboardPage() {
  
  const router = useRouter(); 

  const NO_JSX_CODE = '// No JSX generated for this prompt.';
  const NO_CSS_CODE = '/* No CSS generated for this prompt. */';
  const NO_HTML_CODE = '// No HTML generated for this prompt.'; 

  const { user, token, logout, loading: authLoading } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const [sessionsLoading, setSessionsLoading] = useState<boolean>(true); // For loading the list of sessions
  const [sessionDetailLoading, setSessionDetailLoading] = useState<boolean>(false); // For loading/creating a specific session
  const [error, setError] = useState<string | null>(null); // For displaying error messages

  const [promptInput, setPromptInput] = useState<string>('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [codeToDisplayInModal, setCodeToDisplayInModal] = useState<{ jsx: string; css: string; html:string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && token) {
      const fetchSessions = async () => {
        setSessionsLoading(true);
        setError(null);

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions`, {
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


  const handleCreateNewSession = async () => {
    if (!token) {
      setError('Not authenticated. Please log in.');
      return;
    }

    setSessionDetailLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/new`, {
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
          css: '',
          html:''
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

  const handleLoadSession = async (sessionId: string) => {
    if (!token) {
      setError('Not authenticated. Please log in.');
      return;
    }

    setSessionDetailLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/${sessionId}`, {
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

  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!promptInput.trim() && !imageFile) || !selectedSession || !token) {
      setError('Please select a session and enter a prompt or attach an image.');
      return;
    }

    let base64Image: string | null = null;
    setSessionDetailLoading(true);
    setError(null);

    if (imageFile) {
      try {
        base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              resolve(reader.result as string);
            } else {
              reject(new Error("Failed to read image file."));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        console.log('Image converted to Base64.');
      } catch (err: any) {
        console.error("Error reading image file:", err);
        setError("Failed to read image file. Please try again.");
        setSessionDetailLoading(false);
        return;
      }
    }

    const userMessage: TextMessage | ImageMessage = base64Image
      ? { role: 'user', content: promptInput.trim() || 'Image attached.', imageUrl: base64Image }
      : { role: 'user', content: promptInput.trim() };
    const currentSessionId = selectedSession.id;

    setSelectedSession((prevSession) => {
      if (!prevSession) return null;
      return {
        ...prevSession,
        chat_history: [...(prevSession.chat_history || []), userMessage],
      };
    });
    setPromptInput('');
    setImageFile(null);
    handleClearImage();

    setSessionDetailLoading(true);
    setError(null);

    try {
      const aiResponseThinking: TextMessage = {
        role: 'ai',
        content: 'Thinking...',
      };

      setSelectedSession((prevSession) => {
        if (!prevSession) return null;
        return {
          ...prevSession,
          chat_history: [...(prevSession.chat_history || []), aiResponseThinking],
        };
      });

      // --- MODIFIED: Request body now includes chatHistory and currentGeneratedCode ---
      const requestBody: {
        prompt: string;
        image?: string;
        chatHistory?: (TextMessage | ImageMessage | CodeMessage)[]; // Full history from selectedSession
        currentGeneratedCode?: { jsx?: string; css?: string; html?: string }; // Current component code from selectedSession
      } = {
        prompt: userMessage.content,
      };
      if (userMessage.imageUrl) {
        requestBody.image = userMessage.imageUrl;
      }
      // Add existing chat history for context
      if (selectedSession.chat_history && selectedSession.chat_history.length > 0) {
        requestBody.chatHistory = selectedSession.chat_history;
      }
      // Add current generated code for context (what AI should modify)
      if (selectedSession.generated_code && (selectedSession.generated_code.jsx || selectedSession.generated_code.css || selectedSession.generated_code.html)) {
        requestBody.currentGeneratedCode = selectedSession.generated_code;
      }
      // --- END MODIFIED REQUEST BODY ---

      // --- ACTUAL AI BACKEND CALL ---
      const aiRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(requestBody), // Send the comprehensive request body
      });

      const aiData = await aiRes.json();

      if (!aiRes.ok) {
        const aiErrorMessage = aiData.msg || 'AI response failed.';
        throw new Error(aiErrorMessage);
      }

      const finalAiResponse: CodeMessage = { // AI final response will be code (or text, but structured this way)
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

      // --- Auto-save the session after AI interaction ---
      // Ensure finalChatHistoryForSave correctly captures all messages
      const chatHistoryForSave = [...(selectedSession?.chat_history || [])];
      chatHistoryForSave.push(userMessage, aiResponseThinking); // Add user and 'thinking' message for immediate save
      const finalChatHistoryForSave = [...chatHistoryForSave.slice(0, chatHistoryForSave.length - 1), finalAiResponse]; // Replace thinking message

      const sessionToSave = {
        chat_history: finalChatHistoryForSave, // Save the fully updated chat history
        generated_code: finalAiResponse.code_snippet,
        ui_editor_state: selectedSession?.ui_editor_state || {},
      };

      const saveRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/${currentSessionId}/save`, {
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
      console.error("Error sending prompt to AI or saving session:", err);
      setError(err.message || 'Error processing prompt. Please try again.');
      if (err.message === 'No token, authorization denied' || err.message === 'Token is not valid') {
        logout();
      }
    } finally {
      setSessionDetailLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    if (file.type.startsWith('image/')) { // Basic validation: ensure it's an image
      setImageFile(file);
      setError(null); // Clear any previous errors
      // Optional: Give visual feedback that an image is selected
      console.log('Image selected:', file.name);
    } else {
      setImageFile(null);
      setError('Please select a valid image file (e.g., JPG, PNG, GIF).');
    }
  }
};

const handleClearImage = () => {
  setImageFile(null);
  const fileInput = document.getElementById('image-upload-input') as HTMLInputElement;
  if (fileInput) fileInput.value = ''; // Clear file input field
};

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-700">Loading user authentication...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-red-500">Access Denied. Redirecting to login...</p>
      </div>
    );
  }

  console.log('Current selectedSession:', selectedSession);

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
          {sessionDetailLoading && selectedSession === null ? 'Creating Session...' : 'New Chat'}
        </button>

        <h3 className="text-lg font-semibold mb-2 text-gray-700">Your Chat:</h3>
        {error && <p className="text-red-500 mb-2">{error}</p>} {/* Display any session-related errors */}
        {sessionsLoading ? (
          <p className="text-gray-500">Loading Chat...</p>
        ) : sessions.length === 0 ? (
          <p className="text-gray-500">No Chats yet. Create one to start!</p>
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
          <p className="text-center text-lg mt-10 text-gray-700">Generating Chat ...</p>
        ) : selectedSession ? (
          // Display details if a session is selected
          <div className="bg-white p-6 rounded shadow-md flex-grow border border-blue-200 flex flex-col">
            <p className="text-gray-700 mb-2">Chat ID: <span className="font-mono text-sm">{selectedSession.id}</span></p>

            {/* Displaying actual loaded data - Chat Transcript only for now */}
            <div className="flex-grow overflow-hidden flex flex-col">
                {/* Enhanced chat display container with scrolling */}
                <div className="space-y-3 w-full overflow-y-auto max-h-[calc(100vh-250px)] pr-2 bg-gray-200 rounded p-2">
                    {(selectedSession.chat_history||[])?.length > 0 ? (
                        (selectedSession.chat_history || []).map((message: any, index: number) => (
                            <div
                                key={index}
                                className={`flex ${
                                    message.role === 'user' ? 'justify-end' : 'justify-start'
                                } w-full`}
                            >
                                <div
                                    className={`rounded-lg p-3 shadow-md ${
                                        message.role === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-300 text-gray-800'
                                    } ${
                                        message.code_snippet
                                            ? 'max-w-[calc(100%-2rem)]'
                                            : 'max-w-[75%]'
                                    } overflow-x-hidden break-words flex-shrink-0`}
                                >
                                    <strong className="block capitalize mb-1">{message.role}:</strong>
                                    <p className="text-sm">{message.content}</p>
                                    {/* Display code snippet if available */}
                                    {message.code_snippet && (                                      
                                            (message.code_snippet.jsx && message.code_snippet.jsx !== NO_JSX_CODE && message.code_snippet.jsx !== '') ||
                                             (message.code_snippet.css && message.code_snippet.css !== NO_CSS_CODE && message.code_snippet.css !== '') ||
                                             (message.code_snippet.html && message.code_snippet.html !== NO_HTML_CODE && message.code_snippet.html !== '')
                                            ) && (
                                                <button
                                                  onClick={() => {
                                                    setCodeToDisplayInModal(message.code_snippet);
                                                    setIsModalOpen(true);
                                                  }}
                                                  className="mt-2 py-1 px-2 rounded-lg font-bold transition-colors bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-opacity-75"
                                                >
                                                  Render
                                                </button>
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
              type="file"
              id="image-upload-input" // ID for label/button to click it
              accept="image/*"        // Only accept image files
              className="hidden"      // Hide the default file input
              onChange={handleImageChange}
            />
            <button
              type="button" // Important: type="button" to prevent form submission
              onClick={() => document.getElementById('image-upload-input')?.click()}
              className="p-2 border rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold focus:outline-none focus:ring-2 focus:ring-gray-400"
              title="Attach Image"
              disabled={sessionDetailLoading}
            >
              + {/* Emoji for image icon, or use an SVG/Icon component */}
            </button>
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
            {imageFile && (
            <div className="mt-2 p-2 border rounded-lg bg-gray-100 flex items-center justify-between text-sm text-gray-700">
              <span>Attached: {imageFile.name}</span>
              <button
                onClick={handleClearImage}
                className="ml-2 text-red-500 hover:text-red-700 font-bold leading-none"
                title="Remove Image"
              >
                &times;
              </button>
            </div>
          )}
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
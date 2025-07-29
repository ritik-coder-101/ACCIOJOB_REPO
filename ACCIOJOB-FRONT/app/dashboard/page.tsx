'use client';

import React, { useEffect, useState, useRef , useCallback } from 'react';
import { useAuth } from '../../context/AuthContext'; 
import { useRouter } from 'next/navigation';
import LivePreviewModal from '../../components/LivePreviewModal';


interface BaseChatMessage {
  role: 'user' | 'ai';
  content: string;
}

interface TextMessage extends BaseChatMessage {
  imageUrl?: undefined;   
  code_snippet?: undefined; 
}

interface ImageMessage extends BaseChatMessage {
  imageUrl: string; 
  code_snippet?: undefined;
}

interface CodeMessage extends BaseChatMessage {
  code_snippet: { jsx?: string; css?: string; html?: string }; 
  imageUrl?: undefined;
}


interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  chat_history?: { 
    role?: 'user' | 'ai'; 
    content?: string;
    imageUrl?:string;    
    code_snippet?: { jsx?: string; css?: string; html?:string }; 
  }[];
  generated_code?: { jsx?: string; css?: string;html?:string }; 
  ui_editor_state?: Record<string, unknown>;
}

export default function DashboardPage() {
  
  const router = useRouter(); 

  const NO_JSX_CODE = '// No JSX generated for this prompt.';
  const NO_CSS_CODE = '/* No CSS generated for this prompt. */';
  const NO_HTML_CODE = '// No HTML generated for this prompt.'; 

  const { user, token, logout, loading: authLoading } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const [sessionsLoading, setSessionsLoading] = useState<boolean>(true); 
  const [sessionDetailLoading, setSessionDetailLoading] = useState<boolean>(false); 
  const [error, setError] = useState<string | null>(null);

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

  const handleLoadSession = useCallback(async (sessionId: string) => {
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

  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Error loading session:", err);
      setError(err.message || 'Could not load session details.');
      if (
        err.message === 'No token, authorization denied' ||
        err.message === 'Token is not valid' ||
        err.message === 'Session not found or not authorized'
      ) {
        logout();
      }
    }
  } finally {
    setSessionDetailLoading(false);
  }
}, [token, logout]);

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

          if (data.length > 0 && selectedSession === null) {
              await handleLoadSession(data[0].id);
          }

        } catch (err: unknown) {
          if (err instanceof Error) {
          setError(err.message || 'Could not load sessions.');
          if (err.message === 'No token, authorization denied' || err.message === 'Token is not valid') {
              logout();
          }
        }
        } finally {
          setSessionsLoading(false);
        }

      };

      fetchSessions();
    }
  }, [user, token, logout, selectedSession,handleLoadSession]);

  useEffect(() => {
    if (chatEndRef.current) {
      const timer = setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'instant' });
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

    } catch (err : unknown) {
      if (err instanceof Error) {
      console.error("Error creating new session:", err);
      setError(err.message || 'Could not create new session.');
      if (err.message === 'No token, authorization denied' || err.message === 'Token is not valid') {
        logout();
      }
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
      } catch (err: unknown) {
        if (err instanceof Error) {
        console.error("Error reading image file:", err);
        setError("Failed to read image file. Please try again.");
        setSessionDetailLoading(false);
        return;
        }
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

      const requestBody: {
        prompt: string;
        image?: string;
        chatHistory?: (TextMessage | ImageMessage | CodeMessage)[]; 
        currentGeneratedCode?: { jsx?: string; css?: string; html?: string }; 
      } = {
        prompt: userMessage.content,
      };
      if (userMessage.imageUrl) {
        requestBody.image = userMessage.imageUrl;
      }
      
      if (selectedSession.generated_code && (selectedSession.generated_code.jsx || selectedSession.generated_code.css || selectedSession.generated_code.html)) {
        requestBody.currentGeneratedCode = selectedSession.generated_code;
      }

      const aiRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify(requestBody),
      });

      const aiData = await aiRes.json();

      if (!aiRes.ok) {
        const aiErrorMessage = aiData.msg || 'AI response failed.';
        throw new Error(aiErrorMessage);
      }

      const finalAiResponse: CodeMessage = {
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

      const chatHistoryForSave = [...(selectedSession?.chat_history || [])];
      chatHistoryForSave.push(userMessage, aiResponseThinking);
      const finalChatHistoryForSave = [...chatHistoryForSave.slice(0, chatHistoryForSave.length - 1), finalAiResponse];

      const sessionToSave = {
        chat_history: finalChatHistoryForSave, 
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

    } catch (err: unknown) {
      if (err instanceof Error) {
      console.error("Error sending prompt to AI or saving session:", err);
      setError(err.message || 'Error processing prompt. Please try again.');
      if (err.message === 'No token, authorization denied' || err.message === 'Token is not valid') {
        logout();
      }
    }
    } finally {
      setSessionDetailLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    if (file.type.startsWith('image/')) {
      setImageFile(file);
      setError(null);
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
  if (fileInput) fileInput.value = '';
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
      <div className="w-1/4 p-4 bg-white border-r border-gray-200 shadow-md flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Welcome, {user.email}!</h2>

        <button
          onClick={handleCreateNewSession}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4 w-full"
          disabled={sessionDetailLoading} 
        >
          {sessionDetailLoading && selectedSession === null ? 'Creating Session...' : 'New Chat'}
        </button>

        <h3 className="text-lg font-semibold mb-2 text-gray-700">Your Chat:</h3>
        {error && <p className="text-red-500 mb-2">{error}</p>} 
        {sessionsLoading ? (
          <p className="text-gray-500">Loading Chat...</p>
        ) : sessions.length === 0 ? (
          <p className="text-gray-500">No Chats yet. Create one to start!</p>
        ) : (
          <ul className="overflow-y-auto flex-grow border rounded p-2 bg-gray-100">
            {sessions.map((session) => (
              <li
                key={session.id}
                onClick={() => handleLoadSession(session.id)}
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

        <button
          onClick={logout} 
          className="mt-auto bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-full"
        >
          Logout
        </button>
      </div>

      <div className="flex-grow p-4 bg-gray-100 flex flex-col">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Component Playground</h2>
        {sessionDetailLoading && selectedSession !== null ? (
          <p className="text-center text-lg mt-10 text-gray-700">Generating Chat ...</p>
        ) : selectedSession ? (
          <div className="bg-white p-6 rounded shadow-md flex-grow border border-blue-200 flex flex-col">
            <p className="text-gray-700 mb-2">Chat ID: <span className="font-mono text-sm">{selectedSession.id}</span></p>

            <div className="flex-grow overflow-hidden flex flex-col">
                <div className="space-y-3 w-full overflow-y-auto max-h-[calc(100vh-250px)] pr-2 bg-gray-200 rounded p-2">
                    {(selectedSession.chat_history||[])?.length > 0 ? (
                        (selectedSession.chat_history || []).map((message, index) => (
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
                                    {message.code_snippet && (                                      
                                            (message.code_snippet.jsx && message.code_snippet.jsx !== NO_JSX_CODE && message.code_snippet.jsx !== '') ||
                                             (message.code_snippet.css && message.code_snippet.css !== NO_CSS_CODE && message.code_snippet.css !== '') ||
                                             (message.code_snippet.html && message.code_snippet.html !== NO_HTML_CODE && message.code_snippet.html !== '')
                                            ) && (
                                                <button
                                                  onClick={() => {
                                                    if (message.code_snippet) {
                                                        setCodeToDisplayInModal({
                                                          jsx: message.code_snippet.jsx ?? '',
                                                          css: message.code_snippet.css ?? '',
                                                          html: message.code_snippet.html ?? '',
                                                      });
                                                      }
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
                    <div ref={chatEndRef} />
                </div>
            </div>
            {/* Chat Input Section */}
            <form onSubmit={handleSendPrompt} className="mt-4 flex gap-2 mt-auto">
              <input
              type="file"
              id="image-upload-input" 
              accept="image/*"        
              className="hidden"      
              onChange={handleImageChange}
            />
            <button
              type="button"
              onClick={() => document.getElementById('image-upload-input')?.click()}
              className="p-2 border rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold focus:outline-none focus:ring-2 focus:ring-gray-400"
              title="Attach Image"
              disabled={sessionDetailLoading}
            >
              + 
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
        show={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false); 
          setCodeToDisplayInModal(null);
        }}
        codeToRender={codeToDisplayInModal}
      />
    </div>
  );
}
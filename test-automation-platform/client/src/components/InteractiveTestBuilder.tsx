import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { debugAuth } from '../utils/debugAuth';
import { AuthDebug } from './AuthDebug';

interface ElementMapping {
  id: string;
  name: string;
  selector: string;
  type: string;
  text?: string;
  isStable: boolean;
}

interface TestStep {
  id: string;
  action: string;
  elementName?: string;
  selector?: string;
  value?: any;
  timestamp: Date;
}

interface PageObject {
  id: string;
  name: string;
  url: string;
  elements: ElementMapping[];
  lastUpdated: Date;
}

interface Session {
  id: string;
  currentUrl: string;
  isRecording: boolean;
  recordedSteps: TestStep[];
  currentPageObject?: PageObject;
  elementMappings: ElementMapping[];
}

export const InteractiveTestBuilder: React.FC = () => {
  const { token, user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<'http://' | 'https://'>('https://');
  const [url, setUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [selectedElement, setSelectedElement] = useState<ElementMapping | null>(null);
  const [elementName, setElementName] = useState('');
  const [hoveredSelector, setHoveredSelector] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Debug auth on mount
  useEffect(() => {
    console.log('InteractiveTestBuilder - Auth State:', { token: !!token, user: !!user });
    debugAuth();
  }, [token, user]);

  // API base URL
  const API_BASE = 'http://localhost:3001/api/interactive-test';

  // Start a new session
  const startSession = async () => {
    if (!token) {
      setError('Please log in to use the Interactive Test Builder');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          headless: false,
          slowMo: 100,
          viewport: { width: 1280, height: 720 }
        })
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        await getSessionDetails(data.sessionId);
        setupWebSocket(data.sessionId);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to start session');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Setup WebSocket for real-time updates
  const setupWebSocket = (sessionId: string) => {
    const ws = new WebSocket(`ws://localhost:3001/api/interactive-test/sessions/${sessionId}/ws`);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'stepRecorded':
          setSession(prev => prev ? {
            ...prev,
            recordedSteps: [...prev.recordedSteps, message.data]
          } : null);
          break;

        case 'elementMapped':
          setSession(prev => prev ? {
            ...prev,
            elementMappings: [...prev.elementMappings, message.data]
          } : null);
          break;

        case 'pageAnalyzed':
          setSession(prev => prev ? {
            ...prev,
            currentPageObject: message.data
          } : null);
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    wsRef.current = ws;
  };

  // Get session details
  const getSessionDetails = async (sessionId: string) => {
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSession(data.session);
      }
    } catch (err) {
      console.error('Failed to get session details:', err);
    }
  };

  // Navigate to URL
  const navigateToUrl = async () => {
    if (!sessionId || !url) return;

    setIsLoading(true);
    setError(null);

    // Build full URL with protocol
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `${protocol}${url}`;

    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/navigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url: fullUrl })
      });

      const data = await response.json();

      if (data.success) {
        await getSessionDetails(sessionId);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to navigate');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Start recording
  const startRecording = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/record/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setIsRecording(true);
        await getSessionDetails(sessionId);
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/record/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setIsRecording(false);
        setGeneratedCode(data.testCode);
        await getSessionDetails(sessionId);
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  };

  // Click element
  const clickElement = async (selector: string, elementName?: string) => {
    if (!sessionId) return;

    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/actions/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ selector, elementName })
      });

      const data = await response.json();

      if (data.success) {
        await getSessionDetails(sessionId);
      }
    } catch (err) {
      console.error('Failed to click element:', err);
    }
  };

  // Map new element
  const mapElement = async () => {
    if (!sessionId || !hoveredSelector || !elementName) return;

    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/elements/map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          selector: hoveredSelector, 
          name: elementName 
        })
      });

      const data = await response.json();

      if (data.success) {
        await getSessionDetails(sessionId);
        setElementName('');
        setHoveredSelector(null);
      }
    } catch (err) {
      console.error('Failed to map element:', err);
    }
  };

  // Preview click
  const previewClick = async (selector: string) => {
    if (!sessionId) return;

    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/preview/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ selector })
      });

      const data = await response.json();

      if (data.success) {
        // Show preview info
        console.log('Click preview:', data.preview);
      }
    } catch (err) {
      console.error('Failed to preview click:', err);
    }
  };

  // End session
  const endSession = async () => {
    if (!sessionId) return;

    try {
      await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setSessionId(null);
      setSession(null);
      setIsRecording(false);
      setGeneratedCode('');

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    } catch (err) {
      console.error('Failed to end session:', err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        endSession();
      }
    };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Interactive Test Builder</h1>

        {!token && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Authentication Required</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Please log in with your GitHub account to use the Interactive Test Builder.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Session Control */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Browser Session</h2>
            {!sessionId ? (
              <button
                onClick={startSession}
                disabled={isLoading || !token}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!token ? "Please log in first" : "Start a new browser session"}
              >
                Start Session
              </button>
            ) : (
              <button
                onClick={endSession}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                End Session
              </button>
            )}
          </div>

          {sessionId && (
            <>
              <div className="flex gap-2 mb-4">
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value as 'http://' | 'https://')}
                  className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="https://">HTTPS</option>
                  <option value="http://">HTTP</option>
                </select>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="example.com or full URL"
                  className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={navigateToUrl}
                  disabled={isLoading || !url}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Navigate
                </button>
              </div>

              <div className="flex gap-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    🔴 Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    ⏹ Stop Recording
                  </button>
                )}
              </div>

              {session?.currentUrl && (
                <>
                  <div className="mt-4 p-3 bg-gray-100 rounded">
                    <span className="font-semibold">Current URL:</span> {session.currentUrl}
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-blue-800">
                        <strong>Interactive Overlay Active!</strong>
                        <p className="mt-1">Look for the purple panel on the right side of the browser window. Use it to:</p>
                        <ul className="mt-1 ml-4 list-disc">
                          <li>🔍 Inspect elements by hovering</li>
                          <li>👆 Click to select and name elements</li>
                          <li>⏺️ Record your test actions</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Element Mappings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Page Elements</h2>

            {session?.currentPageObject && (
              <div className="mb-4 p-3 bg-blue-50 rounded">
                <span className="font-semibold">Page:</span> {session.currentPageObject.name}
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {session?.elementMappings.map((element) => (
                <div
                  key={element.id}
                  className={`p-3 border rounded hover:bg-gray-50 cursor-pointer ${
                    selectedElement?.id === element.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedElement(element)}
                >
                  <div className="font-semibold">{element.name}</div>
                  <div className="text-sm text-gray-600">
                    Type: {element.type} | Selector: {element.selector}
                  </div>
                  {element.text && (
                    <div className="text-sm text-gray-500">Text: {element.text}</div>
                  )}
                  <div className="mt-1">
                    <span className={`text-xs px-2 py-1 rounded ${
                      element.isStable ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {element.isStable ? 'Stable' : 'Needs Verification'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Map New Element */}
            <div className="mt-4 p-3 border-t">
              <h3 className="font-semibold mb-2">Map New Element</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={elementName}
                  onChange={(e) => setElementName(e.target.value)}
                  placeholder="Element name..."
                  className="flex-1 px-2 py-1 border rounded text-sm"
                />
                <button
                  onClick={mapElement}
                  disabled={!elementName || !hoveredSelector}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Map
                </button>
              </div>
            </div>
          </div>

          {/* Recorded Steps */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Recorded Steps
              {isRecording && (
                <span className="ml-2 text-sm text-red-600">● Recording</span>
              )}
            </h2>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {session?.recordedSteps.map((step, index) => (
                <div key={step.id} className="p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Step {index + 1}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm mt-1">
                    <span className="font-medium">{step.action}</span>
                    {step.elementName && (
                      <span className="ml-2">on "{step.elementName}"</span>
                    )}
                    {step.value && (
                      <span className="ml-2">with value "{step.value}"</span>
                    )}
                  </div>
                  {step.selector && (
                    <div className="text-xs text-gray-500 mt-1">
                      Selector: {step.selector}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Generated Test Code */}
        {generatedCode && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Generated Test Code</h2>
              <button
                onClick={() => navigator.clipboard.writeText(generatedCode)}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                Copy Code
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
              <code>{generatedCode}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Debug panel */}
      <AuthDebug />
    </div>
  );
};
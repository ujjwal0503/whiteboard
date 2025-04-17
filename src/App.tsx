import React, { useState, useRef, useEffect } from 'react';
import './App.css';

// Simple in-memory database to store sessions
type Session = {
  id: string;
  name: string;
  drawings: DrawingAction[];
};

type DrawingAction = {
  points: Point[];
  color: string;
  lineWidth: number;
};

type Point = {
  x: number;
  y: number;
};

// Main App Component
export default function App() {
  const [view, setView] = useState<'home' | 'whiteboard'>('home');
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionName, setSessionName] = useState<string>('');
  const [sessions, setSessions] = useState<Session[]>([]);
  
  // Function to create a new session
  const createSession = () => {
    if (!sessionName) {
      setSessionName('Whiteboard');
    }
    
    const newId = Math.random().toString(36).substring(2, 9);
    const newSession = {
      id: newId,
      name: sessionName || 'Whiteboard',
      drawings: []
    };
    
    setSessions([...sessions, newSession]);
    setSessionId(newId);
    setView('whiteboard');
  };
  
  // Function to join an existing session
  const joinSession = (id: string) => {
    setSessionId(id);
    setView('whiteboard');
  };
  
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Whiteboard</h1>
      </header>
      
      <main className="app-main">
        {view === 'home' ? (
          <HomeView 
            sessionName={sessionName}
            setSessionName={setSessionName}
            createSession={createSession}
            joinSession={joinSession}
            sessions={sessions}
          />
        ) : (
          <WhiteboardView 
            sessionId={sessionId}
            sessions={sessions}
            setSessions={setSessions}
            goHome={() => setView('home')}
          />
        )}
      </main>
    </div>
  );
}

// Home View Component
function HomeView({ 
  sessionName, 
  setSessionName, 
  createSession, 
  joinSession, 
  sessions 
}: {
  sessionName: string;
  setSessionName: (name: string) => void;
  createSession: () => void;
  joinSession: (id: string) => void;
  sessions: Session[];
}) {
  return (
    <div className="home-container">
      <h2>Create a New Whiteboard</h2>
      <div className="create-form">
        <input
          type="text"
          placeholder="Enter whiteboard name (or leave blank for 'Whiteboard')"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          className="input-field"
        />
        <button 
          onClick={createSession}
          className="create-button"
        >
          Create Whiteboard
        </button>
      </div>
      
      {sessions.length > 0 && (
        <div className="join-container">
          <h2>Join Existing Whiteboard</h2>
          <ul className="sessions-list">
            {sessions.map(session => (
              <li 
                key={session.id} 
                className="session-item"
                onClick={() => joinSession(session.id)}
              >
                {session.name} <span className="session-id-small">ID: {session.id}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Whiteboard View Component
function WhiteboardView({ 
  sessionId, 
  sessions, 
  setSessions,
  goHome
}: {
  sessionId: string;
  sessions: Session[];
  setSessions: (sessions: Session[]) => void;
  goHome: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [undoStack, setUndoStack] = useState<DrawingAction[]>([]);
  const [redoStack, setRedoStack] = useState<DrawingAction[]>([]);
  
  // Find the current session based on sessionId
  useEffect(() => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
    }
  }, [sessionId, sessions]);
  
  // Set up canvas size on mount and window resize
  useEffect(() => {
    function setupCanvas() {
      if (!canvasRef.current || !canvasContainerRef.current) return;
      
      const canvas = canvasRef.current;
      const container = canvasContainerRef.current;
      
      // Set canvas size to match container
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // Redraw everything after resize
      redrawCanvas();
    }
    
    // Initial setup
    setupCanvas();
    
    // Setup on window resize
    window.addEventListener('resize', setupCanvas);
    
    return () => {
      window.removeEventListener('resize', setupCanvas);
    };
  }, []);
  
  // Redraw the canvas
  const redrawCanvas = () => {
    if (!currentSession || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw all paths
    currentSession.drawings.forEach(drawing => {
      if (drawing.points.length < 2) return;
      
      ctx.beginPath();
      ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
      
      for (let i = 1; i < drawing.points.length; i++) {
        ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
      }
      
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });
  };
  
  // Redraw the canvas whenever the session changes
  useEffect(() => {
    redrawCanvas();
  }, [currentSession]);
  
  // Handle mouse down event
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
    
    // Start drawing on the canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };
  
  // Handle mouse move event
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentPath(prev => [...prev, { x, y }]);
    
    // Draw on the canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };
  
  // Handle mouse up event
  const handleMouseUp = () => {
    if (!isDrawing || !currentSession) return;
    
    // Only save if the path has points
    if (currentPath.length > 0) {
      // Save the current drawing action
      const newDrawing: DrawingAction = {
        points: [...currentPath],
        color: currentColor,
        lineWidth: lineWidth
      };
      
      // Update the session with the new drawing
      const updatedSession = {
        ...currentSession,
        drawings: [...currentSession.drawings, newDrawing]
      };
      
      // Update the sessions array
      const updatedSessions = sessions.map(s => 
        s.id === sessionId ? updatedSession : s
      );
      
      setSessions(updatedSessions);
      setCurrentSession(updatedSession);
      setUndoStack(prev => [...prev, newDrawing]);
      setRedoStack([]); // Clear redo stack on new drawing
    }
    
    setIsDrawing(false);
    setCurrentPath([]);
  };
  
  // Handle mouse leave event
  const handleMouseLeave = () => {
    if (isDrawing) {
      handleMouseUp();
    }
  };
  
  // Handle touch events for mobile support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
    
    // Start drawing on the canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    setCurrentPath(prev => [...prev, { x, y }]);
    
    // Draw on the canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };
  
  const handleTouchEnd = () => {
    handleMouseUp(); // Reuse the same logic as mouse up
  };
  
  // Undo function
  const handleUndo = () => {
    if (!currentSession || currentSession.drawings.length === 0) return;
    
    const lastDrawing = currentSession.drawings[currentSession.drawings.length - 1];
    const newDrawings = currentSession.drawings.slice(0, -1);
    
    // Update the session
    const updatedSession = {
      ...currentSession,
      drawings: newDrawings
    };
    
    // Update the sessions array
    const updatedSessions = sessions.map(s => 
      s.id === sessionId ? updatedSession : s
    );
    
    setSessions(updatedSessions);
    setCurrentSession(updatedSession);
    setRedoStack(prev => [...prev, lastDrawing]);
    setUndoStack(prev => prev.slice(0, -1));
  };
  
  // Redo function
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const drawingToRedo = redoStack[redoStack.length - 1];
    
    // Update the session
    const updatedSession = {
      ...currentSession!,
      drawings: [...currentSession!.drawings, drawingToRedo]
    };
    
    // Update the sessions array
    const updatedSessions = sessions.map(s => 
      s.id === sessionId ? updatedSession : s
    );
    
    setSessions(updatedSessions);
    setCurrentSession(updatedSession);
    setUndoStack(prev => [...prev, drawingToRedo]);
    setRedoStack(prev => prev.slice(0, -1));
  };
  
  // Function to clear the canvas
  const handleClear = () => {
    if (!currentSession) return;
    
    // Create new session with no drawings
    const updatedSession = {
      ...currentSession,
      drawings: []
    };
    
    // Update the sessions array
    const updatedSessions = sessions.map(s => 
      s.id === sessionId ? updatedSession : s
    );
    
    setSessions(updatedSessions);
    setCurrentSession(updatedSession);
    
    // Clear the canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    
    // Update undo/redo stacks
    setUndoStack([]);
    setRedoStack([]);
  };
  
  if (!currentSession) {
    return <div>Session not found</div>;
  }
  
  // Predefined colors for quick selection
  const colorOptions = [
    '#000000', // Black
    '#ff0000', // Red
    '#0000ff', // Blue
    '#008000', // Green
    '#ff8c00', // Orange
    '#800080', // Purple
    '#ff69b4', // Pink
    '#a52a2a', // Brown
  ];
  
  return (
    <div className="whiteboard-container">
      <div className="whiteboard-header">
        <div className="session-info">
          <h2>{currentSession.name}</h2>
          <p className="session-id">Session ID: {sessionId}</p>
        </div>
        <div className="action-buttons">
          <button 
            onClick={handleUndo} 
            disabled={currentSession.drawings.length === 0}
            className="action-button"
            title="Undo"
          >
            Undo
          </button>
          <button 
            onClick={handleRedo} 
            disabled={redoStack.length === 0}
            className="action-button"
            title="Redo"
          >
            Redo
          </button>
          <button
            onClick={handleClear}
            className="clear-button"
            title="Clear Canvas"
          >
            Clear
          </button>
          <button
            onClick={goHome}
            className="home-button"
            title="Back to Home"
          >
            Back
          </button>
        </div>
      </div>
      
      <div className="tools-container">
        <div className="color-tools">
          <label>Colors:</label>
          <div className="color-options">
            {colorOptions.map((color) => (
              <div 
                key={color}
                className={`color-option ${color === currentColor ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
                title={color}
              />
            ))}
          </div>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="color-picker"
            title="Custom Color"
          />
        </div>
        <div className="brush-tools">
          <label>Brush Size: {lineWidth}px</label>
          <input
            type="range"
            min="1"
            max="30"
            value={lineWidth}
            onChange={(e) => setLineWidth(parseInt(e.target.value))}
            className="brush-size"
          />
        </div>
      </div>
      
      <div className="canvas-container" ref={canvasContainerRef}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="drawing-canvas"
        />
      </div>
    </div>
  );
}
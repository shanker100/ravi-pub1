import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Settings, AlertTriangle } from 'lucide-react';
import Visualizer from './components/Visualizer';
import Logs from './components/Logs';
import { LiveClient } from './services/liveClient';
import { LogEntry, ConnectionStatus } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [volume, setVolume] = useState(0);
  const clientRef = useRef<LiveClient | null>(null);

  // Group partial transcripts to avoid flooding logs
  const [partialUser, setPartialUser] = useState('');
  const [partialModel, setPartialModel] = useState('');

  // Handle logs
  const addLog = useCallback((entry: LogEntry) => {
    setLogs(prev => {
      // Determine if we should merge with previous log (for streaming text)
      // This is a simplified logic: if the type matches the last one and it's 'user' or 'model', append.
      // However, the LiveClient emits text chunks. 
      // Let's rely on the LiveClient to emit chunks and we just append.
      // A better UX is to update the *last* log entry if it's the same turn.
      
      const last = prev[prev.length - 1];
      if (last && last.type === entry.type && (entry.type === 'user' || entry.type === 'model')) {
        // Update existing entry
        const updated = { ...last, text: last.text + entry.text };
        return [...prev.slice(0, -1), updated];
      }
      return [...prev, entry];
    });
  }, []);

  const handleToggleConnection = async () => {
    if (status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING) {
      clientRef.current?.disconnect();
      setStatus(ConnectionStatus.DISCONNECTED);
      setVolume(0);
    } else {
      if (!process.env.API_KEY) {
        alert('API Key is missing in environment variables.');
        return;
      }

      const client = new LiveClient(process.env.API_KEY);
      clientRef.current = client;

      client.onStatusChange = (s) => setStatus(s as ConnectionStatus);
      client.onLog = addLog;
      client.onVolume = setVolume;

      await client.connect();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row overflow-hidden">
      
      {/* Left Panel: Visualizer & Controls */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-slate-900 border-r border-slate-800 flex flex-col items-center justify-between p-6 z-10 shadow-xl">
        <div className="w-full text-center mb-8">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
            Confluence Agent
          </h1>
          <p className="text-sm text-slate-500">Powered by Gemini Live</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full relative">
           <Visualizer volume={volume} isActive={status === ConnectionStatus.CONNECTED} />
           
           <div className="absolute bottom-10 flex flex-col items-center gap-2">
             <div className={`text-xs uppercase tracking-widest font-semibold px-3 py-1 rounded-full ${
               status === ConnectionStatus.CONNECTED ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
               status === ConnectionStatus.CONNECTING ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
               status === ConnectionStatus.ERROR ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
               'bg-slate-800 text-slate-400'
             }`}>
               {status}
             </div>
           </div>
        </div>

        <div className="w-full mt-8">
          <button
            onClick={handleToggleConnection}
            disabled={status === ConnectionStatus.CONNECTING}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-semibold transition-all duration-300 ${
              status === ConnectionStatus.CONNECTED
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50'
            }`}
          >
            {status === ConnectionStatus.CONNECTED ? (
              <>
                <MicOff className="w-5 h-5" />
                End Session
              </>
            ) : status === ConnectionStatus.CONNECTING ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                Start Conversation
              </>
            )}
          </button>
          
          <p className="text-xs text-center text-slate-600 mt-4">
            Allows creating, reading, and updating Confluence spaces/pages via voice.
          </p>
        </div>
      </div>

      {/* Right Panel: Logs */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 relative">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-400">Activity Log</span>
          </div>
          {/* Instructions Hint */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
             <AlertTriangle className="w-3 h-3" />
             <span>Ensure webhook is active</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 p-4">
             <Logs logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Bot, User, Wrench, AlertCircle, Info } from 'lucide-react';

interface LogsProps {
  logs: LogEntry[];
}

const Logs: React.FC<LogsProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'user': return <User className="w-4 h-4 text-blue-400" />;
      case 'model': return <Bot className="w-4 h-4 text-emerald-400" />;
      case 'tool-call': return <Wrench className="w-4 h-4 text-amber-400" />;
      case 'tool-result': return <Info className="w-4 h-4 text-purple-400" />;
      case 'system': return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900 rounded-lg border border-slate-800 h-full">
      {logs.length === 0 && (
        <div className="text-center text-slate-500 mt-10">
          <p>Ready to connect. Start the conversation to see logs here.</p>
        </div>
      )}
      {logs.map((log) => (
        <div key={log.id} className={`flex gap-3 text-sm animate-fade-in`}>
          <div className="mt-1 flex-shrink-0 opacity-80">
            {getIcon(log.type)}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-semibold uppercase text-xs tracking-wider opacity-70">
                {log.type.replace('-', ' ')}
              </span>
              <span className="text-xs text-slate-600 font-mono">
                {formatTime(log.timestamp)}
              </span>
            </div>
            <div className="text-slate-300 whitespace-pre-wrap break-words">
              {log.text}
            </div>
            {log.details && (
              <div className="mt-2 bg-slate-950 rounded p-2 border border-slate-800 overflow-x-auto">
                <pre className="text-xs text-amber-100 font-mono">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default Logs;

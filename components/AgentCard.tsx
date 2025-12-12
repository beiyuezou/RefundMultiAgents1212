import React from 'react';

interface AgentCardProps {
  name: string;
  role: string;
  status: 'waiting' | 'active' | 'done';
  message: string;
}

export const AgentCard: React.FC<AgentCardProps> = ({ name, role, status, message }) => {
  const isIdle = status === 'waiting';
  const isActive = status === 'active';
  const isDone = status === 'done';

  return (
    <div className={`relative p-6 rounded-2xl mb-6 transition-all duration-700 border-2 ${
      isActive 
        ? 'bg-white border-blue-200 shadow-3d-card scale-105 z-10' 
        : isDone 
          ? 'bg-gradient-to-br from-green-50 to-white border-green-200 shadow-sm opacity-90' 
          : 'bg-slate-50 border-transparent opacity-50 grayscale'
    }`}>
        {/* Status indicator bubble */}
        <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white text-sm font-bold transition-colors duration-500 ${
             isActive ? 'bg-blue-500 text-white animate-bounce' : 
             isDone ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-500'
        }`}>
            {isDone ? '✓' : isActive ? '●' : '·'}
        </div>

      <div className="flex items-center gap-4 mb-3">
        {/* 3D Avatar Circle */}
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-inner border-2 border-white ${
          isActive ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white ring-4 ring-blue-100' : 
          isDone ? 'bg-gradient-to-br from-green-400 to-green-600 text-white' : 'bg-slate-200 text-slate-400'
        }`}>
          {name[0]}
        </div>
        <div>
          <h3 className={`font-bold text-xl ${isActive ? 'text-blue-800' : 'text-slate-700'}`}>{role}</h3>
          <p className="text-sm text-slate-500 font-medium tracking-wide uppercase">Agent: {name}</p>
        </div>
      </div>
      
      {/* Message Bubble */}
      <div className={`mt-2 p-4 rounded-xl text-lg font-medium leading-relaxed ${
          isActive ? 'bg-blue-50 text-blue-900 border border-blue-100' : 'bg-transparent text-slate-600'
      }`}>
        {isActive && <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>}
        {message}
      </div>
    </div>
  );
};
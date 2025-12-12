import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top', className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Determine positioning classes based on the `position` prop
  let positionClasses = '';
  let arrowClasses = '';
  let transitionClasses = '';

  switch (position) {
    case 'top':
      positionClasses = 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      arrowClasses = 'bottom-[-4px] left-1/2 -translate-x-1/2';
      transitionClasses = isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95';
      break;
    case 'bottom':
      positionClasses = 'top-full left-1/2 -translate-x-1/2 mt-2';
      arrowClasses = 'top-[-4px] left-1/2 -translate-x-1/2';
      transitionClasses = isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95';
      break;
    case 'left':
      positionClasses = 'right-full top-1/2 -translate-y-1/2 mr-2';
      arrowClasses = 'right-[-4px] top-1/2 -translate-y-1/2';
      transitionClasses = isVisible ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-2 scale-95';
      break;
    case 'right':
      positionClasses = 'left-full top-1/2 -translate-y-1/2 ml-2';
      arrowClasses = 'left-[-4px] top-1/2 -translate-y-1/2';
      transitionClasses = isVisible ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-2 scale-95';
      break;
  }

  return (
    <div 
      className={`relative inline-flex items-center justify-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      <div 
        className={`absolute ${positionClasses} flex flex-col items-center transition-all duration-200 transform ${transitionClasses} ${isVisible ? 'visible' : 'invisible'} z-[60] pointer-events-none w-max max-w-[200px]`}
      >
        <div className="relative z-10 px-3 py-2 text-xs font-semibold text-white bg-slate-800 rounded-lg shadow-xl text-center leading-snug">
          {content}
        </div>
        <div className={`w-2 h-2 bg-slate-800 transform rotate-45 absolute ${arrowClasses} z-0`}></div>
      </div>
    </div>
  );
};
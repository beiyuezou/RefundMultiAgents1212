import React from 'react';

interface LargeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success';
  fullWidth?: boolean;
  themeColor?: string;
}

export const LargeButton: React.FC<LargeButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  themeColor = 'blue',
  className = '', 
  ...props 
}) => {
  // 3D Button Styles: Top gradient + Hard bottom border/shadow + Transform on click
  
  const baseStyle = "relative py-4 px-8 rounded-xl text-xl font-bold transition-all transform active:translate-y-[4px] active:shadow-none flex items-center justify-center gap-2 select-none";
  
  // Dynamic color construction
  const primaryClass = `bg-gradient-to-b from-${themeColor}-500 to-${themeColor}-600 text-white shadow-3d-btn border-${themeColor}-600`;
  const successClass = `bg-gradient-to-b from-green-500 to-green-600 text-white shadow-3d-btn-success hover:brightness-110`;
  const secondaryClass = "bg-gradient-to-b from-slate-50 to-slate-100 text-slate-700 shadow-3d-btn-sec border border-slate-200 hover:bg-slate-50 dark:from-slate-700 dark:to-slate-800 dark:text-slate-200 dark:border-slate-600";

  const variants = {
    primary: primaryClass + " hover:brightness-110",
    secondary: secondaryClass,
    success: successClass,
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className} disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-[4px] disabled:grayscale`}
      {...props}
    >
      {children}
    </button>
  );
};
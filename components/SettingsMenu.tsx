import React, { useRef, useEffect } from 'react';
import { TRANSLATIONS } from '../constants';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  appLanguage: 'en' | 'zh' | 'es';
  setAppLanguage: (lang: 'en' | 'zh' | 'es') => void;
  displayMode: 'light' | 'dark' | 'contrast';
  setDisplayMode: (mode: 'light' | 'dark' | 'contrast') => void;
  themeColor: 'blue' | 'violet' | 'emerald' | 'orange';
  setThemeColor: (color: 'blue' | 'violet' | 'emerald' | 'orange') => void;
  fontSizePercent: number;
  setFontSizePercent: React.Dispatch<React.SetStateAction<number>>;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  isOpen,
  onClose,
  appLanguage,
  setAppLanguage,
  displayMode,
  setDisplayMode,
  themeColor,
  setThemeColor,
  fontSizePercent,
  setFontSizePercent
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[appLanguage];
  const highContrast = displayMode === 'contrast';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={menuRef} className="absolute top-16 right-6 z-50 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 animate-pop-in p-4">
       <div className="space-y-6">
          {/* Appearance Mode */}
          <div>
             <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">{t.appearance}</h4>
             <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                <button 
                  onClick={() => setDisplayMode('light')} 
                  className={`flex-1 py-1.5 rounded-md text-sm font-bold transition-all ${displayMode === 'light' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                   {t.modeLight}
                </button>
                <button 
                  onClick={() => setDisplayMode('dark')} 
                  className={`flex-1 py-1.5 rounded-md text-sm font-bold transition-all ${displayMode === 'dark' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                   {t.modeDark}
                </button>
                <button 
                  onClick={() => setDisplayMode('contrast')} 
                  className={`flex-1 py-1.5 rounded-md text-sm font-bold transition-all ${displayMode === 'contrast' ? 'bg-black text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                   {t.modeContrast}
                </button>
             </div>
          </div>

          {/* Theme Color */}
          {!highContrast && (
            <div>
               <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">Accent Color</h4>
               <div className="flex justify-between px-2">
                  {[
                    { c: 'blue', hex: 'bg-blue-500' },
                    { c: 'violet', hex: 'bg-violet-500' },
                    { c: 'emerald', hex: 'bg-emerald-500' },
                    { c: 'orange', hex: 'bg-orange-500' }
                  ].map((item) => (
                     <button 
                       key={item.c}
                       onClick={() => setThemeColor(item.c as any)}
                       className={`w-10 h-10 rounded-full ${item.hex} transition-transform hover:scale-110 flex items-center justify-center ${themeColor === item.c ? 'ring-4 ring-slate-200 dark:ring-slate-600' : ''}`}
                     >
                       {themeColor === item.c && <span className="text-white text-lg">✓</span>}
                     </button>
                  ))}
               </div>
            </div>
          )}

          {/* Font Size */}
          <div>
             <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">{t.fontSize}</h4>
             <div className="flex items-center gap-3">
                <button onClick={() => setFontSizePercent(p => Math.max(80, p - 10))} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-full font-bold hover:bg-slate-200 dark:hover:bg-slate-600 dark:text-white">A-</button>
                <div className="flex-1 text-center font-bold text-slate-700 dark:text-slate-200">{fontSizePercent}%</div>
                <button onClick={() => setFontSizePercent(p => Math.min(150, p + 10))} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-full font-bold hover:bg-slate-200 dark:hover:bg-slate-600 dark:text-white">A+</button>
             </div>
          </div>

          {/* Language */}
          <div>
             <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">{t.language}</h4>
             <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setAppLanguage('en')}
                  className={`py-2 rounded-lg font-bold text-sm border-2 ${appLanguage === 'en' ? `border-${themeColor}-500 text-${themeColor}-600 bg-${themeColor}-50 dark:bg-slate-700 dark:text-white` : 'border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                >
                  EN
                </button>
                <button 
                  onClick={() => setAppLanguage('zh')}
                  className={`py-2 rounded-lg font-bold text-sm border-2 ${appLanguage === 'zh' ? `border-${themeColor}-500 text-${themeColor}-600 bg-${themeColor}-50 dark:bg-slate-700 dark:text-white` : 'border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                >
                  中文
                </button>
                <button 
                  onClick={() => setAppLanguage('es')}
                  className={`py-2 rounded-lg font-bold text-sm border-2 ${appLanguage === 'es' ? `border-${themeColor}-500 text-${themeColor}-600 bg-${themeColor}-50 dark:bg-slate-700 dark:text-white` : 'border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                >
                  ES
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};
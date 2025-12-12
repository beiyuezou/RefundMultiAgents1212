import React, { useState } from 'react';
import { RefundCase, RefundTemplate } from '../types';
import { LargeButton } from './LargeButton';
import { TRANSLATIONS } from '../constants';

interface WelcomeScreenProps {
  history: RefundCase[];
  templates: RefundTemplate[];
  appLanguage: 'en' | 'zh' | 'es';
  themeColor: string;
  highContrast: boolean;
  onStartNew: () => void;
  onStartZh: () => void;
  onLoadCase: (item: RefundCase) => void;
  onStartTemplate: (template: RefundTemplate) => void;
  onDeleteTemplate: (id: string, e: React.MouseEvent) => void;
  onDeleteHistory: (id: string, e: React.MouseEvent) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  history,
  templates,
  appLanguage,
  themeColor,
  highContrast,
  onStartNew,
  onStartZh,
  onLoadCase,
  onStartTemplate,
  onDeleteTemplate,
  onDeleteHistory
}) => {
  const [historySearch, setHistorySearch] = useState('');
  const t = TRANSLATIONS[appLanguage];

  const txtColor = (defaultColor: string) => highContrast ? 'text-black' : defaultColor;
  const txtSubColor = (defaultColor: string) => highContrast ? 'text-slate-900 font-medium' : defaultColor;

  const filteredHistory = history.filter(item => {
    const term = historySearch.toLowerCase();
    const name = (item.extractedData?.merchantName || item.evidenceFiles[0]?.name || "Untitled Case").toLowerCase();
    const date = new Date(item.createdAt || Date.now()).toLocaleDateString().toLowerCase();
    return name.includes(term) || date.includes(term);
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-10 animate-pop-in py-10">
      <div className="relative group cursor-default text-center">
         <div className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-300 rounded-full blur-xl opacity-60 animate-pulse"></div>
         <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-300 rounded-full blur-xl opacity-60 animate-pulse delay-700"></div>
         
         <div className={`inline-block bg-gradient-to-br from-white to-blue-50 dark:from-slate-700 dark:to-slate-800 p-8 rounded-[2rem] shadow-3d-card transform transition-transform hover:scale-105 duration-300 relative z-10 ${highContrast ? 'border-4 border-black' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-20 w-20 text-${themeColor}-600 drop-shadow-md`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
         </div>
      </div>
      
      <div className="space-y-4 text-center">
        <h1 className={`text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-sm ${highContrast ? 'text-black' : `text-transparent bg-clip-text bg-gradient-to-r from-${themeColor}-700 to-${themeColor}-500 dark:from-${themeColor}-400 dark:to-${themeColor}-200`}`}>
          {t.title}
        </h1>
        <p className={`text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed font-medium ${txtSubColor('text-slate-600 dark:text-slate-300')}`}>
          {t.subtitle}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg">
        <LargeButton themeColor={themeColor} onClick={onStartNew}>
          {t.startNew}
        </LargeButton>
        <LargeButton themeColor={themeColor} variant="secondary" onClick={onStartZh}>
          {t.startZh}
        </LargeButton>
      </div>

      {/* Templates Section */}
      {templates.length > 0 && (
        <div className="w-full max-w-3xl mt-12 animate-pop-in">
           <div className="flex items-center gap-3 mb-4">
             <div className={`h-px flex-1 ${highContrast ? 'bg-black' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
             <span className={`${txtColor('text-slate-400 dark:text-slate-500')} font-bold uppercase text-sm tracking-wider`}>{t.templateStart}</span>
             <div className={`h-px flex-1 ${highContrast ? 'bg-black' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {templates.map(template => (
              <div 
                key={template.id}
                onClick={() => onStartTemplate(template)}
                className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border hover:shadow-md cursor-pointer transition-all group relative overflow-hidden ${highContrast ? 'border-black' : `border-slate-200 dark:border-slate-700 hover:border-${themeColor}-300`}`}
              >
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={(e) => onDeleteTemplate(template.id, e)}
                     className="text-slate-300 hover:text-red-500"
                   >✕</button>
                </div>
                <div className="flex items-center gap-3 mb-2">
                   <span className="text-2xl">📋</span>
                   <h3 className={`font-bold truncate ${txtColor('text-slate-700 dark:text-slate-200')}`}>{template.name}</h3>
                </div>
                <p className={`text-xs line-clamp-2 ${txtSubColor('text-slate-500 dark:text-slate-400')}`}>
                   {template.data.merchantName} • {template.data.issueDescription?.substring(0, 40) || 'No description'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History Section */}
      {history.length > 0 && (
        <div className="w-full max-w-2xl mt-12 animate-pop-in">
          <div className="flex items-center gap-3 mb-4">
             <div className={`h-px flex-1 ${highContrast ? 'bg-black' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
             <span className={`${txtColor('text-slate-400 dark:text-slate-500')} font-bold uppercase text-sm tracking-wider`}>{t.history}</span>
             <div className={`h-px flex-1 ${highContrast ? 'bg-black' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
          </div>
          
          <div className="mb-4 relative group">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
             </div>
             <input 
               type="text"
               value={historySearch}
               onChange={(e) => setHistorySearch(e.target.value)}
               placeholder={t.searchPlaceholder}
               className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-${themeColor}-100 transition-all ${highContrast ? 'text-black border-black placeholder:text-slate-600' : 'text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 focus:border-blue-400 placeholder:text-slate-400'}`}
             />
             {historySearch && <button onClick={() => setHistorySearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">✕</button>}
          </div>
          
          <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border hover:shadow-md transition-all cursor-pointer flex justify-between items-center group ${highContrast ? 'border-black' : 'border-slate-200 dark:border-slate-700'}`}
                    onClick={() => onLoadCase(item)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                        item.generatedLetter ? 'bg-green-100 text-green-600' : `bg-${themeColor}-100 text-${themeColor}-600`
                      }`}>
                        {item.generatedLetter ? '✓' : '📝'}
                      </div>
                      <div>
                        <h4 className={`font-bold ${txtColor('text-slate-800 dark:text-slate-100')}`}>{item.extractedData?.merchantName || item.evidenceFiles[0]?.name || "Untitled Case"}</h4>
                        <p className={`text-sm ${txtSubColor('text-slate-500 dark:text-slate-400')}`}>{new Date(item.createdAt || Date.now()).toLocaleDateString()} • {item.extractedData?.amount ? `${item.extractedData.amount} ${item.extractedData.currency}` : 'Draft'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className={`text-${themeColor}-600 font-bold text-sm px-3 py-1 rounded-lg bg-${themeColor}-50 hover:bg-${themeColor}-100 opacity-0 group-hover:opacity-100 transition-opacity`}>Open</button>
                      <button onClick={(e) => onDeleteHistory(item.id, e)} className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors" title="Delete">✕</button>
                    </div>
                  </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { LargeButton } from './LargeButton';
import { TRANSLATIONS } from '../constants';

interface LetterResultProps {
  letter: string;
  onUpdateLetter: (text: string) => void;
  onDownload: () => void;
  onStartNew: () => void;
  merchantEmail?: string;
  bookingRef?: string;
  appLanguage: 'en' | 'zh' | 'es';
  themeColor: string;
  highContrast: boolean;
  onToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const LetterResult: React.FC<LetterResultProps> = ({
  letter,
  onUpdateLetter,
  onDownload,
  onStartNew,
  merchantEmail,
  bookingRef,
  appLanguage,
  themeColor,
  highContrast,
  onToast
}) => {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const t = TRANSLATIONS[appLanguage];
  const txtColor = (defaultColor: string) => highContrast ? 'text-black' : defaultColor;

  // Simple one-time confetti burst effect on mount
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenEmailClient = (provider: 'gmail' | 'outlook' | 'default') => {
      const recipient = merchantEmail || '';
      const subject = encodeURIComponent(`Refund Request - ${bookingRef || 'Transaction'}`);
      const body = encodeURIComponent(letter);
      
      let url = '';
      if (provider === 'gmail') url = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${subject}&body=${body}`;
      else if (provider === 'outlook') url = `https://outlook.office.com/mail/deeplink/compose?to=${recipient}&subject=${subject}&body=${body}`;
      else url = `mailto:${recipient}?subject=${subject}&body=${body}`;
      
      window.open(url, '_blank');
      setEmailModalOpen(false);
  };

  return (
    <div className="max-w-3xl mx-auto animate-pop-in pb-10 relative">
         {showConfetti && (
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 pointer-events-none z-10">
                 <div className="text-6xl animate-bounce">🎉</div>
             </div>
         )}
         
         <div className="text-center mb-8">
             <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg animate-pop-in">
                ✓
             </div>
             <h2 className={`text-3xl font-bold ${txtColor('text-slate-800 dark:text-white')}`}>{t.letterReady}</h2>
             <p className="text-slate-500 dark:text-slate-400 mt-2">{t.letterSub}</p>
         </div>

         <div className={`bg-white dark:bg-slate-800 p-8 rounded-xl shadow-3d-card border-2 relative group ${highContrast ? 'border-black' : 'border-white dark:border-slate-700'}`}>
             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(letter);
                        onToast('success', t.copied);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 p-2 rounded text-sm font-bold text-slate-600 dark:text-slate-300"
                >
                    {t.copy}
                </button>
             </div>
             <textarea 
                className={`w-full h-[500px] resize-none outline-none font-serif text-lg leading-relaxed bg-transparent ${txtColor('text-slate-800 dark:text-slate-200')}`}
                value={letter}
                onChange={(e) => onUpdateLetter(e.target.value)}
             />
         </div>

         <div className="flex flex-col md:flex-row gap-4 mt-8">
             <LargeButton themeColor={themeColor} variant="secondary" onClick={() => {
                 navigator.clipboard.writeText(letter);
                 onToast('success', t.copied);
             }}>
                 {t.copy}
             </LargeButton>
             <LargeButton themeColor={themeColor} variant="secondary" onClick={onDownload}>
                 {t.download}
             </LargeButton>
             <LargeButton themeColor={themeColor} onClick={() => setEmailModalOpen(true)}>
                 {t.draftEmail}
             </LargeButton>
         </div>
         
         <div className="mt-12 text-center">
            <button 
               onClick={onStartNew}
               className="text-slate-400 font-bold hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
                {t.startNew}
            </button>
         </div>

         {/* Email Modal */}
         {emailModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-pop-in">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm relative border dark:border-slate-700">
                    <button onClick={() => setEmailModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 text-center">{t.selectMode}</h3>
                    <div className="space-y-3">
                        <button onClick={() => handleOpenEmailClient('gmail')} className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:border-red-100 hover:bg-red-50 dark:hover:bg-slate-700 transition-all group">
                            <span className="text-2xl">📧</span><span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-red-600">{t.openGmail}</span>
                        </button>
                        <button onClick={() => handleOpenEmailClient('outlook')} className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:border-blue-100 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all group">
                            <span className="text-2xl">📬</span><span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600">{t.openOutlook}</span>
                        </button>
                        <button onClick={() => handleOpenEmailClient('default')} className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group">
                            <span className="text-2xl">✉️</span><span className="font-bold text-slate-700 dark:text-slate-200">{t.openDefault}</span>
                        </button>
                    </div>
                </div>
            </div>
         )}
     </div>
  );
};
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefundStep, RefundCase, ExtractedEvidence, RefundTemplate } from './types';
import { extractEvidenceAgent, policyAnalysisAgent, letterGeneratorAgent } from './services/geminiService';
import { saveCaseToDB, getAllCasesFromDB, deleteCaseFromDB, saveTemplateToDB, getAllTemplatesFromDB, deleteTemplateFromDB } from './services/db';
import { StepWizard } from './components/StepWizard';
import { AgentCard } from './components/AgentCard';
import { ChatBot } from './components/ChatBot';
import { TRANSLATIONS } from './constants';

// Sub-components
import { SettingsMenu } from './components/SettingsMenu';
import { WelcomeScreen } from './components/WelcomeScreen';
import { UploadDashboard } from './components/UploadDashboard';
import { AnalysisReview } from './components/AnalysisReview';
import { LetterResult } from './components/LetterResult';
import { ToastContainer, ToastMessage } from './components/Toast';

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const AUTO_SAVE_INTERVAL_MS = 60000; // 1 minute

const App: React.FC = () => {
  // --- Global State ---
  const [step, setStep] = useState<RefundStep>(RefundStep.WELCOME);
  const [caseData, setCaseData] = useState<RefundCase>({
    id: crypto.randomUUID(),
    userLanguage: 'en',
    evidenceFiles: [],
    userNotes: '',
  });
  const [history, setHistory] = useState<RefundCase[]>([]);
  const [templates, setTemplates] = useState<RefundTemplate[]>([]);
  
  // --- Settings State ---
  const [fontSizePercent, setFontSizePercent] = useState(100);
  const [appLanguage, setAppLanguage] = useState<'en'|'zh'|'es'>('en');
  const [displayMode, setDisplayMode] = useState<'light'|'dark'|'contrast'>('light');
  const [themeColor, setThemeColor] = useState<'blue'|'violet'|'emerald'|'orange'>('blue');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- Process State ---
  const [agent1Status, setAgent1Status] = useState<'waiting'|'active'|'done'>('waiting');
  const [agent2Status, setAgent2Status] = useState<'waiting'|'active'|'done'>('waiting');
  const [agent3Status, setAgent3Status] = useState<'waiting'|'active'|'done'>('waiting');
  const [error, setError] = useState<string | null>(null);
  const [errorContext, setErrorContext] = useState<'EXTRACTION' | 'POLICY' | 'LETTER' | 'UPDATE_POLICY' | null>(null);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [useGoogleSearch, setUseGoogleSearch] = useState(false); 

  // --- UX State ---
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Computed
  const highContrast = displayMode === 'contrast';
  const t = TRANSLATIONS[appLanguage];
  const caseDataRef = useRef(caseData);
  const lastSavedSnapshotRef = useRef<string>('');

  // --- Effects ---

  // Sync ref for autosave
  useEffect(() => {
    caseDataRef.current = caseData;
  }, [caseData]);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Apply Appearance Settings
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSizePercent}%`;
    if (displayMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [fontSizePercent, displayMode]);

  // Load Data
  useEffect(() => {
    const initData = async () => {
      try {
        const [savedHistory, savedTemplates] = await Promise.all([
          getAllCasesFromDB(),
          getAllTemplatesFromDB()
        ]);
        setHistory(savedHistory);
        setTemplates(savedTemplates);
      } catch (e) {
        console.error("Failed to load data from DB", e);
        showToast('error', 'Failed to load local data');
      }
    };
    initData();
  }, []);

  // Auto-Save Logic
  useEffect(() => {
    const interval = setInterval(async () => {
      const current = caseDataRef.current;
      const hasContent = current.evidenceFiles.length > 0 || current.userNotes.trim().length > 0 || current.extractedData;
      const isWorking = step !== RefundStep.WELCOME;

      if (hasContent && isWorking) {
        const snapshot = JSON.stringify({
            id: current.id,
            notes: current.userNotes,
            extracted: current.extractedData,
            filesCount: current.evidenceFiles.length,
            step: step 
        });

        if (snapshot !== lastSavedSnapshotRef.current) {
            try {
                await saveToHistory(current);
                lastSavedSnapshotRef.current = snapshot;
            } catch (e) {
                console.error("Auto-save failed", e);
            }
        }
      }
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [step]); 

  // --- Helper Functions ---

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const saveToHistory = useCallback(async (currentCase: RefundCase) => {
    try {
      const caseToSave = { ...currentCase, createdAt: currentCase.createdAt || Date.now() };
      setHistory(prev => {
        const filtered = prev.filter(c => c.id !== caseToSave.id);
        return [caseToSave, ...filtered];
      });
      await saveCaseToDB(caseToSave);
    } catch (e) {
      console.error("Failed to save history to DB", e);
    }
  }, []);

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteCaseFromDB(id);
      setHistory(prev => prev.filter(c => c.id !== id));
      showToast('info', 'Case deleted from history');
    } catch (e) { console.error(e); }
  };

  const handleStartNew = (languageOverride?: 'en' | 'zh' | 'es') => {
    if (languageOverride) {
        setAppLanguage(languageOverride);
    }
    const lang = languageOverride || appLanguage;
    setCaseData({ id: crypto.randomUUID(), userLanguage: lang, evidenceFiles: [], userNotes: '' });
    setStep(RefundStep.UPLOAD_EVIDENCE);
    resetAgents();
  };

  const resetAgents = () => {
      setAgent1Status('waiting');
      setAgent2Status('waiting');
      setAgent3Status('waiting');
      setError(null);
  };

  const handleLoadCase = (savedCase: RefundCase) => {
    setCaseData(savedCase);
    setError(null);
    if (savedCase.generatedLetter) { setStep(RefundStep.FINAL_LETTER); setAgent1Status('done'); setAgent2Status('done'); setAgent3Status('done'); } 
    else if (savedCase.policyAnalysis) { setStep(RefundStep.REVIEW_ANALYSIS); setAgent1Status('done'); setAgent2Status('done'); } 
    else { setStep(RefundStep.UPLOAD_EVIDENCE); }
  };

  const handleStartTemplate = (template: RefundTemplate) => {
    setCaseData({
      id: crypto.randomUUID(),
      userLanguage: appLanguage,
      evidenceFiles: [],
      userNotes: template.data.userNotes || '',
      extractedData: {
        merchantName: template.data.merchantName || '',
        merchantEmail: template.data.merchantEmail || '',
        transactionDate: new Date().toISOString().split('T')[0],
        amount: '',
        currency: template.data.currency || 'USD',
        issueDescription: template.data.issueDescription || '',
      }
    });
    setStep(RefundStep.REVIEW_ANALYSIS);
    setAgent1Status('done'); setAgent2Status('waiting'); setAgent3Status('waiting');
  };

  const handleSaveTemplate = async () => {
    const name = prompt("Enter a name for this template:");
    if (!name) return;
    const template: RefundTemplate = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      data: {
        merchantName: caseData.extractedData?.merchantName || '',
        merchantEmail: caseData.extractedData?.merchantEmail || '',
        issueDescription: caseData.extractedData?.issueDescription || '',
        userNotes: caseData.userNotes,
        currency: caseData.extractedData?.currency || ''
      }
    };
    await saveTemplateToDB(template);
    setTemplates(prev => [template, ...prev]);
    showToast('success', t.templateSaved);
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTemplateFromDB(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    showToast('info', 'Template deleted');
  };

  // --- AI Operations ---

  const startAnalysis = async () => { 
    if (caseData.evidenceFiles.length === 0 && caseData.userNotes.trim().length < 10) { 
        showToast('error', t.provideEvidence);
        return; 
    }
    setError(null); setErrorContext(null); setStep(RefundStep.PROCESSING);
    
    try { 
        setAgent1Status('active'); 
        const extracted = await extractEvidenceAgent(caseData.evidenceFiles, caseData.userNotes, useGoogleSearch); 
        setCaseData(prev => ({ ...prev, extractedData: extracted })); 
        setAgent1Status('done'); 
        
        setAgent2Status('active'); 
        const analysis = await policyAnalysisAgent(extracted); 
        setCaseData(prev => ({ ...prev, policyAnalysis: analysis })); 
        setAgent2Status('done'); 
        
        setStep(RefundStep.REVIEW_ANALYSIS); 
    } catch (err: any) { 
        console.error(err); 
        setError(t.agentError); 
        setErrorContext('EXTRACTION'); 
        setStep(RefundStep.UPLOAD_EVIDENCE); 
        setAgent1Status('waiting'); 
        setAgent2Status('waiting');
    }
  };

  const handleReAnalyzePolicy = async () => { 
      if (!caseData.extractedData) return; 
      setIsReAnalyzing(true); 
      try { 
          const analysis = await policyAnalysisAgent(caseData.extractedData); 
          setCaseData(prev => ({ ...prev, policyAnalysis: analysis })); 
          showToast('success', 'Analysis updated');
      } catch (err) { 
          setError("Failed to refresh."); 
          setErrorContext('UPDATE_POLICY'); 
      } finally { 
          setIsReAnalyzing(false); 
      } 
  };
  
  const generateFinalLetter = async () => { 
      if (!caseData.extractedData || !caseData.policyAnalysis) return;
      const { merchantName, amount, currency, transactionDate, issueDescription } = caseData.extractedData;
      if (!merchantName?.trim() || !amount?.trim() || !currency?.trim() || !transactionDate?.trim() || !issueDescription?.trim()) { 
          showToast('error', t.requiredFields); 
          return; 
      }
      
      setError(null); setErrorContext(null); setStep(RefundStep.GENERATING_LETTER); setAgent3Status('active');
      
      try { 
          const letter = await letterGeneratorAgent(caseData.extractedData, caseData.policyAnalysis, caseData.userLanguage); 
          setCaseData(prev => { 
              const updated = { ...prev, generatedLetter: letter }; 
              saveToHistory(updated); 
              return updated; 
          }); 
          setAgent3Status('done'); 
          setStep(RefundStep.FINAL_LETTER); 
      } catch (err) { 
          setError("Failed to generate letter."); 
          setErrorContext('LETTER'); 
          setStep(RefundStep.REVIEW_ANALYSIS); 
          setAgent3Status('waiting'); 
      }
  };

  const updateExtractedData = (field: keyof ExtractedEvidence, value: string) => {
    setCaseData(prev => prev.extractedData ? ({ ...prev, extractedData: { ...prev.extractedData, [field]: value } }) : prev);
  };

  const retryOperation = () => { 
      setError(null);
      if (errorContext === 'EXTRACTION') setStep(RefundStep.UPLOAD_EVIDENCE); 
      else if (errorContext === 'POLICY' || errorContext === 'UPDATE_POLICY') handleReAnalyzePolicy(); 
      else if (errorContext === 'LETTER') generateFinalLetter(); 
  };

  const downloadLetter = () => {
    if (!caseData.generatedLetter) return;
    const element = document.createElement("a");
    const file = new Blob([caseData.generatedLetter], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Refund_Appeal_${caseData.extractedData?.merchantName || 'Draft'}.txt`;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
    showToast('success', 'Download started');
  };

  const txtColor = (defaultColor: string) => highContrast ? 'text-black' : defaultColor;
  const txtSubColor = (defaultColor: string) => highContrast ? 'text-slate-900 font-medium' : defaultColor;

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans selection:bg-blue-200 selection:text-blue-900 ${highContrast ? 'bg-white' : 'bg-[#FDFDFD] dark:bg-slate-900'}`}>
      
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <header className={`backdrop-blur-md border-b py-4 px-6 sticky top-0 z-40 ${highContrast ? 'bg-white border-black' : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'}`}>
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setStep(RefundStep.WELCOME)}>
            <div className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform ${highContrast ? 'bg-black' : `bg-gradient-to-br from-${themeColor}-500 to-${themeColor}-700`}`}>R</div>
            <span className={`text-xl font-bold hidden md:inline tracking-tight group-hover:text-${themeColor}-600 transition-colors ${txtColor('text-slate-800 dark:text-white')}`}>{t.title}</span>
          </div>
          <div className="relative">
             <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isSettingsOpen ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
               <span className="text-2xl">⚙️</span>
             </button>
             <SettingsMenu 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)}
                appLanguage={appLanguage} setAppLanguage={setAppLanguage}
                displayMode={displayMode} setDisplayMode={setDisplayMode}
                themeColor={themeColor} setThemeColor={setThemeColor}
                fontSizePercent={fontSizePercent} setFontSizePercent={setFontSizePercent}
             />
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-8 overflow-x-hidden">
        <div className="max-w-5xl mx-auto mt-4">
          <StepWizard currentStep={step} language={appLanguage} themeColor={themeColor} />
          
          {/* Global Error Banner */}
          {error && (
             <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl shadow-sm animate-shake flex items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                   <span className="text-2xl">⚠️</span>
                   <p className="font-bold">{error}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                   {(errorContext === 'EXTRACTION') && <button onClick={() => { setError(null); setStep(RefundStep.UPLOAD_EVIDENCE); }} className="px-4 py-2 bg-red-100 dark:bg-red-800 hover:bg-red-200 text-red-800 dark:text-red-100 rounded-lg font-bold text-sm transition-colors">{t.actionCheckFiles}</button>}
                   <button onClick={retryOperation} className="px-4 py-2 bg-red-100 dark:bg-red-800 hover:bg-red-200 text-red-800 dark:text-red-100 rounded-lg font-bold text-sm transition-colors">{t.retry}</button>
                   <button onClick={() => setError(null)} className="px-4 py-2 text-red-400 hover:text-red-700 font-bold text-sm">{t.dismiss}</button>
                </div>
             </div>
          )}
          
          {step === RefundStep.WELCOME && (
              <WelcomeScreen 
                  history={history}
                  templates={templates}
                  appLanguage={appLanguage}
                  themeColor={themeColor}
                  highContrast={highContrast}
                  onStartNew={() => handleStartNew()}
                  onStartZh={() => handleStartNew('zh')}
                  onLoadCase={handleLoadCase}
                  onStartTemplate={handleStartTemplate}
                  onDeleteTemplate={handleDeleteTemplate}
                  onDeleteHistory={handleDeleteHistory}
              />
          )}

          {step === RefundStep.UPLOAD_EVIDENCE && (
              <UploadDashboard 
                  caseData={caseData}
                  onUpdateCase={setCaseData}
                  onAnalyze={startAnalysis}
                  appLanguage={appLanguage}
                  themeColor={themeColor}
                  highContrast={highContrast}
                  onToast={showToast}
              />
          )}
          
          {step === RefundStep.PROCESSING && (
                <div className="max-w-2xl mx-auto space-y-6 animate-pop-in">
                  <div className="text-center mb-8">
                    <h2 className={`text-3xl font-bold ${txtColor('text-slate-800 dark:text-white')}`}>{t.processing}</h2>
                    <p className={`${txtSubColor('text-slate-500 dark:text-slate-400')}`}>{t.processingSub}</p>
                  </div>
                  <div className="space-y-6">
                    <AgentCard name="Sherlock" role="Evidence Collector" status={agent1Status} message={agent1Status === 'active' ? "Reading documents..." : "Done."} />
                    <AgentCard name="Watson" role="Policy Analyst" status={agent2Status} message={agent2Status === 'active' ? "Analyzing laws..." : "Done."} />
                  </div>
                </div>
          )}

          {step === RefundStep.REVIEW_ANALYSIS && (
              <AnalysisReview 
                  caseData={caseData}
                  onUpdateData={updateExtractedData}
                  onReAnalyze={handleReAnalyzePolicy}
                  isReAnalyzing={isReAnalyzing}
                  onGenerate={generateFinalLetter}
                  onSaveTemplate={handleSaveTemplate}
                  appLanguage={appLanguage}
                  themeColor={themeColor}
                  highContrast={highContrast}
              />
          )}

          {step === RefundStep.GENERATING_LETTER && (
                <div className="max-w-2xl mx-auto space-y-6 animate-pop-in text-center pt-20">
                   <h2 className={`text-3xl font-bold mb-8 ${txtColor('text-slate-800 dark:text-white')}`}>{t.drafting}</h2>
                   <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
          )}

          {step === RefundStep.FINAL_LETTER && caseData.generatedLetter && (
              <LetterResult 
                  letter={caseData.generatedLetter}
                  onUpdateLetter={(text) => setCaseData(prev => ({...prev, generatedLetter: text}))}
                  onDownload={downloadLetter}
                  onStartNew={() => handleStartNew()}
                  merchantEmail={caseData.extractedData?.merchantEmail}
                  bookingRef={caseData.extractedData?.bookingReference}
                  appLanguage={appLanguage}
                  themeColor={themeColor}
                  highContrast={highContrast}
                  onToast={showToast}
              />
          )}
        </div>
      </main>

      <ChatBot appLanguage={appLanguage} />
    </div>
  );
};

export default App;
import React, { useState, useRef } from 'react';
import { RefundCase, EvidenceFile } from '../types';
import { LargeButton } from './LargeButton';
import { Tooltip } from './Tooltip';
import { TRANSLATIONS, NOTE_TEMPLATES } from '../constants';

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface UploadDashboardProps {
  caseData: RefundCase;
  onUpdateCase: React.Dispatch<React.SetStateAction<RefundCase>>;
  onAnalyze: () => void;
  appLanguage: 'en' | 'zh' | 'es';
  themeColor: string;
  highContrast: boolean;
  onToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}

export const UploadDashboard: React.FC<UploadDashboardProps> = ({
  caseData,
  onUpdateCase,
  onAnalyze,
  appLanguage,
  themeColor,
  highContrast,
  onToast
}) => {
  const [uploadMode, setUploadMode] = useState<'files'|'voice'|'notes'>('files');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isDictating, setIsDictating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const t = TRANSLATIONS[appLanguage];
  const txtColor = (defaultColor: string) => highContrast ? 'text-black' : defaultColor;
  const txtSubColor = (defaultColor: string) => highContrast ? 'text-slate-900 font-medium' : defaultColor;

  const processFiles = (files: FileList | File[]) => {
    setUploadWarning(null); 
    setIsProcessingFiles(true);
    const fileArray = Array.from(files);
    const validFilesToProcess: File[] = [];
    const oversizedFiles: string[] = [];
    fileArray.forEach(file => {
      if (file.size > MAX_FILE_SIZE_BYTES) oversizedFiles.push(file.name);
      else validFilesToProcess.push(file);
    });
    
    if (oversizedFiles.length > 0) {
        const msg = `Skipped oversized files: ${oversizedFiles.join(', ')}`;
        setUploadWarning(msg);
        onToast('error', msg);
    }
    
    if (validFilesToProcess.length === 0) { setIsProcessingFiles(false); return; }

    const newEntries: EvidenceFile[] = validFilesToProcess.map(file => {
        let fileType: any = 'image';
        if (file.type.includes('pdf')) fileType = 'pdf';
        if (file.type.includes('audio')) fileType = 'audio';
        if (file.type.includes('video')) fileType = 'video';
        return { id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), base64: '', mimeType: file.type, type: fileType, name: file.name, uploadStatus: 'processing', uploadProgress: 0 };
    });
    
    // Use functional update to avoid stale state
    onUpdateCase(prev => ({ 
        ...prev, 
        evidenceFiles: [...prev.evidenceFiles, ...newEntries] 
    }));

    let finishedCount = 0;
    const checkFinished = () => { finishedCount++; if (finishedCount === validFilesToProcess.length) setIsProcessingFiles(false); };

    newEntries.forEach(entry => {
        const reader = new FileReader();
        reader.onprogress = (e) => { 
            if (e.lengthComputable) { 
                const percent = Math.round((e.loaded / e.total) * 100); 
                onUpdateCase(prev => ({
                    ...prev,
                    evidenceFiles: prev.evidenceFiles.map(f => f.id === entry.id ? { ...f, uploadProgress: percent } : f)
                }));
            } 
        };
        reader.onload = (e) => { 
            const result = e.target?.result as string; 
            if (result) { 
                const base64 = result.split(',')[1]; 
                onUpdateCase(prev => ({ 
                    ...prev,
                    evidenceFiles: prev.evidenceFiles.map(f => f.id === entry.id ? { ...f, base64, uploadStatus: 'done', uploadProgress: 100 } : f)
                }));
            } 
            checkFinished(); 
        };
        reader.onerror = () => { 
            onUpdateCase(prev => ({
                ...prev,
                evidenceFiles: prev.evidenceFiles.map(f => f.id === entry.id ? { ...f, uploadStatus: 'error' } : f)
            }));
            onToast('error', `Failed to upload ${entry.name}`);
            checkFinished(); 
        };
        reader.readAsDataURL(entry.file!);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files.length > 0) processFiles(e.target.files); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files); };
  
  const handleAddUrl = (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (!urlInput.trim()) return; 
      const newFile: EvidenceFile = { id: crypto.randomUUID(), preview: '', mimeType: 'text/uri-list', type: 'url', name: urlInput.trim(), uploadStatus: 'done', uploadProgress: 100 }; 
      onUpdateCase(prev => ({ ...prev, evidenceFiles: [...prev.evidenceFiles, newFile] }));
      setUrlInput(''); 
  };
  
  const removeFile = (id: string) => {
      onUpdateCase(prev => ({ ...prev, evidenceFiles: prev.evidenceFiles.filter(f => f.id !== id) }));
  };

  const toggleRecording = async () => { 
      if(isRecording) { 
          mediaRecorderRef.current?.stop(); 
          setIsRecording(false); 
      } else { 
          try { 
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); 
              const mediaRecorder = new MediaRecorder(stream); 
              mediaRecorderRef.current = mediaRecorder; 
              audioChunksRef.current = []; 
              mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data); 
              mediaRecorder.onstop = () => { 
                  const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' }); 
                  const reader = new FileReader(); 
                  reader.readAsDataURL(audioBlob); 
                  reader.onloadend = () => { 
                      const base64String = (reader.result as string).split(',')[1]; 
                      const newFile: EvidenceFile = { id: crypto.randomUUID(), preview: URL.createObjectURL(audioBlob), base64: base64String, mimeType: 'audio/mp3', type: 'audio', name: `Voice Record ${new Date().toLocaleTimeString()}`, uploadStatus: 'done', uploadProgress: 100 }; 
                      onUpdateCase(prev => ({ ...prev, evidenceFiles: [...prev.evidenceFiles, newFile] })); 
                      stream.getTracks().forEach(track => track.stop()); 
                  }; 
              }; 
              mediaRecorder.start(); 
              setIsRecording(true); 
          } catch (err) { 
              onToast('error', t.micAccess);
          } 
      } 
  };

  const toggleDictation = () => { 
      if(isDictating) { 
          recognitionRef.current?.stop(); 
          setIsDictating(false); 
      } else { 
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; 
          if(!SpeechRecognition) { onToast('error', t.speechUnsupport); return; } 
          const recognition = new SpeechRecognition(); 
          recognition.continuous = true; 
          recognition.interimResults = true; 
          recognition.lang = appLanguage === 'zh' ? 'zh-CN' : 'en-US'; 
          recognition.onresult = (event: any) => { 
              let finalTranscript = ''; 
              for (let i = event.resultIndex; i < event.results.length; ++i) { 
                  if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript; 
              } 
              if(finalTranscript) onUpdateCase(prev => ({ ...prev, userNotes: prev.userNotes + ' ' + finalTranscript })); 
          }; 
          recognition.onerror = (e: any) => { console.error(e); setIsDictating(false); }; 
          recognitionRef.current = recognition; 
          recognition.start(); 
          setIsDictating(true); 
      } 
  };

  const applyTemplate = (text: string) => {
      onUpdateCase(prev => {
          const current = prev.userNotes.trim();
          return {
              ...prev,
              userNotes: current ? current + "\n\n" + text : text
          };
      });
  };

  return (
    <div className="max-w-4xl mx-auto animate-pop-in pb-10">
      <div className="text-center mb-8">
        <h2 className={`text-3xl font-bold mb-2 ${txtColor('text-slate-800 dark:text-white')}`}>{t.evidenceDashboard}</h2>
      </div>
      <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-3d-card border-2 p-6 md:p-8 mb-8 transition-all relative overflow-hidden flex flex-col min-h-[500px] ${highContrast ? 'border-black' : 'border-white dark:border-slate-700'}`}>
         <div className="flex flex-col md:flex-row justify-between items-center mb-6 pb-6 border-b border-slate-100 dark:border-slate-700 gap-4">
            <h3 className={`text-xl font-bold ${txtSubColor('text-slate-500 dark:text-slate-400')}`}>{t.evidenceSubtitle}</h3>
            <div className="relative z-20">
              <select value={uploadMode} onChange={(e) => setUploadMode(e.target.value as any)} className={`appearance-none pl-4 pr-10 py-3 rounded-xl font-bold text-lg cursor-pointer focus:outline-none transition-all shadow-sm ${
                      uploadMode === 'files' ? `bg-${themeColor}-50 text-${themeColor}-700 border-2 border-${themeColor}-200 dark:bg-slate-700 dark:text-white dark:border-slate-600` :
                      uploadMode === 'voice' ? 'bg-red-50 text-red-700 border-2 border-red-200 dark:bg-slate-700 dark:text-white dark:border-slate-600' :
                      'bg-yellow-50 text-yellow-700 border-2 border-yellow-200 dark:bg-slate-700 dark:text-white dark:border-slate-600'
                  }`}>
                  <option value="files">📁 {t.files}</option>
                  <option value="voice">🎙️ {t.voice}</option>
                  <option value="notes">✍️ {t.notes}</option>
              </select>
            </div>
         </div>
         <div className="flex-1 flex flex-col relative">
            {uploadMode === 'files' && (
                <div className={`flex-1 flex flex-col animate-pop-in`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                    <div onClick={() => fileInputRef.current?.click()} className={`flex-1 border-4 border-dashed rounded-3xl transition-all cursor-pointer p-6 text-center group flex flex-col items-center justify-center min-h-[300px] relative mb-6 ${isDragging ? 'border-blue-500 bg-blue-50' : `bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-700 ${highContrast ? 'border-black' : 'border-blue-100 dark:border-slate-600'}`}`}>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf,audio/*,video/*" multiple onChange={handleFileSelect}/>
                        
                        {isProcessingFiles && caseData.evidenceFiles.every(f => !f.uploadStatus || f.uploadStatus === 'done') ? (
                            <div className="flex flex-col items-center animate-pulse">
                                <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-sm font-bold text-blue-600">{t.processingFiles}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center pointer-events-none">
                                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full shadow-md flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <span className={`text-${themeColor}-500 text-4xl font-bold`}>+</span>
                                </div>
                                <h4 className={`text-xl font-bold mb-2 ${txtColor('text-slate-700 dark:text-slate-200')}`}>{t.dragDrop}</h4>
                                <p className={`text-sm ${txtSubColor('text-slate-400')}`}>Images, PDF, Audio, Video (Max {MAX_FILE_SIZE_MB}MB)</p>
                            </div>
                        )}
                        {uploadWarning && <div className="absolute bottom-4 left-0 right-0 mx-4 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-bold animate-pulse">⚠️ {uploadWarning}</div>}
                    </div>
                    <form onSubmit={handleAddUrl} className="flex gap-2">
                        <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder={t.pasteLink} className={`flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-sm border-2 dark:border-slate-600 dark:text-white focus:outline-none focus:border-${themeColor}-400`}/>
                        <LargeButton themeColor={themeColor} type="submit" className="w-auto px-6 py-2 text-sm" disabled={!urlInput.trim()}>Add</LargeButton>
                    </form>
                </div>
            )}
            {uploadMode === 'voice' && (
               <div className="flex-1 flex flex-col items-center justify-center animate-pop-in relative">
                  {isRecording && <div className="absolute w-60 h-60 bg-red-100 rounded-full animate-ping opacity-75"></div>}
                  <button onClick={toggleRecording} className={`w-40 h-40 rounded-full flex items-center justify-center shadow-3d-btn transition-transform z-10 border-8 ${isRecording ? 'bg-red-500 border-red-100 scale-110' : 'bg-gradient-to-b from-white to-slate-50 border-slate-100 hover:border-red-50'}`}>
                      {isRecording ? <div className="w-12 h-12 bg-white rounded-lg shadow-sm"></div> : <div className="w-12 h-12 bg-red-500 rounded-full shadow-inner"></div>}
                  </button>
                  <p className={`mt-10 font-bold text-2xl transition-colors ${isRecording ? 'text-red-500 animate-pulse' : txtColor('text-slate-400')}`}>{isRecording ? t.recording : t.tapRecord}</p>
               </div>
            )}
            {uploadMode === 'notes' && (
               <div className="flex-1 flex flex-col animate-pop-in relative h-full">
                  <div className="flex flex-wrap items-center gap-2 mb-4 px-1">
                      <span className={`text-xs font-bold uppercase tracking-wider ${txtColor('text-slate-400')}`}>{t.useTemplate}:</span>
                      {['flight','hotel','medical','other'].map(k => <button key={k} onClick={() => applyTemplate((NOTE_TEMPLATES[appLanguage] as any)[k])} className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-full text-xs font-bold transition-colors border border-yellow-200">{t[`tpl${k.charAt(0).toUpperCase() + k.slice(1)}` as keyof typeof t]}</button>)}
                  </div>
                  <textarea className={`w-full flex-1 p-6 bg-yellow-50/50 dark:bg-slate-900 border-2 rounded-2xl text-xl shadow-inner-depth focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-yellow-100 focus:border-yellow-200 dark:border-slate-600 dark:text-white outline-none resize-none transition-all leading-relaxed ${highContrast ? 'text-black border-black' : 'text-slate-700 border-yellow-100/50'}`} placeholder="Type details..." value={caseData.userNotes} onChange={(e) => onUpdateCase(prev => ({ ...prev, userNotes: e.target.value }))} style={{ minHeight: '300px' }}/>
                  <button onClick={toggleDictation} className={`absolute bottom-6 right-6 p-4 rounded-xl shadow-lg transition-all border border-yellow-200 ${isDictating ? 'bg-yellow-500 text-white animate-bounce' : 'bg-white text-yellow-600 hover:bg-yellow-50'}`}><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button>
               </div>
            )}
         </div>
      </div>
      {(caseData.evidenceFiles.length > 0 || caseData.userNotes.trim().length > 0) && (
        <div className={`bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 p-6 animate-pop-in mb-8 ${highContrast ? 'border-black' : 'border-slate-200 dark:border-slate-700'}`}>
           <h3 className="font-bold text-slate-500 uppercase tracking-wider mb-4 text-sm flex items-center gap-2"><span>🗂️</span> {t.collectedEvidence}</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {caseData.evidenceFiles.map((file) => (
                <div key={file.id} className={`flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border relative group hover:shadow-md transition-shadow ${highContrast ? 'border-black' : 'border-slate-100 dark:border-slate-700'}`}>
                   <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">{file.type === 'image' && <img src={file.preview} className="w-full h-full object-cover rounded-lg" />}{file.type === 'pdf' && '📄'}{file.type === 'audio' && '🎙️'}{file.type === 'video' && '🎬'}</div>
                   <div className="flex-1 min-w-0">
                       <p className={`text-sm font-bold truncate ${txtColor('text-slate-700 dark:text-slate-200')}`}>{file.name}</p>
                       {file.uploadStatus === 'processing' && <div className="w-full bg-slate-200 rounded-full h-1 mt-1"><div className="bg-blue-500 h-full" style={{width: `${file.uploadProgress}%`}}></div></div>}
                   </div>
                   <button onClick={() => removeFile(file.id)} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-red-500 hover:text-white flex items-center justify-center text-xs">✕</button>
                </div>
              ))}
           </div>
        </div>
      )}
      <div className="flex justify-center"><LargeButton themeColor={themeColor} className="w-full md:w-2/3 shadow-2xl" onClick={onAnalyze} disabled={caseData.evidenceFiles.length === 0 && caseData.userNotes.trim().length === 0}>{t.analyze}</LargeButton></div>
    </div>
  );
};
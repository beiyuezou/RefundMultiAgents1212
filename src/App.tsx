import React, { useState, useRef, useEffect } from 'react';
import { RefundStep, RefundCase, EvidenceFile, ExtractedEvidence, RefundTemplate } from './types';
import { extractEvidenceAgent, policyAnalysisAgent, letterGeneratorAgent } from './services/geminiService';
import { saveCaseToDB, getAllCasesFromDB, deleteCaseFromDB, saveTemplateToDB, getAllTemplatesFromDB, deleteTemplateFromDB } from './services/db';
import { StepWizard } from './components/StepWizard';
import { LargeButton } from './components/LargeButton';
import { AgentCard } from './components/AgentCard';
import { ChatBot } from './components/ChatBot';
import { Tooltip } from './components/Tooltip';

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const AUTO_SAVE_INTERVAL_MS = 60000; // 1 minute

// Pre-written templates for manual notes to guide users
const NOTE_TEMPLATES = {
  en: {
    flight: "Flight [Number] from [Origin] to [Destination] on [Date] was cancelled. The airline offered a voucher, but I want a full refund to my original payment method.",
    hotel: "Checked into [Hotel Name] on [Date]. The room was unacceptable due to [Issue: Hygiene/Safety/Noise]. I complained to the front desk at [Time], but they did not resolve it.",
    medical: "I had to cancel my trip scheduled for [Date] due to a medical emergency. I have attached a doctor's certificate diagnosing me with [Condition].",
    other: "I purchased [Service/Item] on [Date] for [Amount]. It was not provided as described because [Reason]. I contacted support on [Date] but received no response."
  },
  zh: {
    flight: "我预定的[日期]从[出发地]飞往[目的地]的航班[航班号]被取消了。航空公司只提供了代金券，但我要求退回到原支付方式。",
    hotel: "我在[日期]入住[酒店名称]，房间卫生/安全状况极差，具体问题是[问题描述]。我向前台投诉了但未获解决。",
    medical: "由于[日期]突发急病，我无法出行。已附上医生开具的诊断证明，确诊为[病情]。",
    other: "我在[日期]支付[金额]购买了[服务/商品]。由于[原因]，服务未按约定提供。我在[日期]联系了客服但无回应。"
  },
  es: {
    flight: "El vuelo [Número] de [Origen] a [Destino] el [Fecha] fue cancelado. La aerolínea ofreció un bono, pero quiero un reembolso completo a mi método de pago original.",
    hotel: "Me registré en [Nombre Hotel] el [Fecha]. La habitación era inaceptable debido a [Problema]. Me quejé en recepción a las [Hora], pero no lo solucionaron.",
    medical: "Tuve que cancelar mi viaje programado para el [Fecha] debido a una emergencia médica. Adjunto certificado médico con el diagnóstico [Condición].",
    other: "Compré [Servicio] el [Fecha] por [Monto]. No se entregó como se describió porque [Razón]. Contacté al soporte el [Fecha] sin respuesta."
  }
};

const TRANSLATIONS = {
  en: {
    title: "Refund Multi-Agents",
    subtitle: "Your personal AI legal team. We fight for your travel refunds so you don't have to.",
    startNew: "Start New Case",
    startZh: "🇨🇳 开启中文服务",
    history: "Your Case History",
    searchPlaceholder: "Search by merchant, date, or amount...",
    evidenceDashboard: "Evidence Dashboard",
    evidenceSubtitle: "Choose how you want to add evidence:",
    files: "Files & Links",
    voice: "Voice Record",
    notes: "Manual Notes",
    analyze: "Analyze All Evidence ➔",
    processing: "Processing...",
    processingSub: "Our agents are reviewing your evidence.",
    analysisComplete: "Analysis Complete",
    analysisSub: "Here is the summary of your case and our legal assessment. Please correct any missing details.",
    saveTemplate: "💾 Save as Template",
    merchant: "Merchant Name",
    emailPlaceholder: "support@example.com",
    merchantEmail: "Merchant Email",
    amount: "Amount",
    currency: "Currency",
    date: "Date",
    reference: "Reference / PNR",
    issue: "Issue Description",
    verifiedSources: "Verified Sources",
    expertOpinion: "Expert Opinion",
    update: "Update",
    probability: "Probability",
    likely: "Likely Refundable",
    challenging: "Challenging Case",
    keyArgument: "Key Argument",
    strategy: "Strategy",
    generate: "✓ Generate Appeal Letter",
    back: "← Go Back",
    drafting: "Drafting...",
    letterReady: "Letter Ready!",
    letterSub: "Your professional appeal is ready to send.",
    copy: "📋 Copy",
    download: "⬇️ Download",
    draftEmail: "✉️ Draft Email",
    new: "🔄 New",
    error: "Error",
    retry: "Retry",
    dismiss: "Dismiss",
    templateStart: "Start from Template",
    noItems: "No items yet",
    recording: "Recording in progress...",
    tapRecord: "Tap to Record",
    recordHint: "Explain your situation verbally. We'll transcribe it.",
    dragDrop: "Drag & Drop or Click",
    pasteLink: "Paste Link (https://...)",
    micAccess: "Microphone access denied. Please allow microphone permissions.",
    speechUnsupport: "Speech recognition not supported in this browser.",
    provideEvidence: "Please provide some evidence (Photo, PDF, Audio) or a detailed description.",
    agentError: "Our agents encountered a problem processing your request.",
    requiredFields: "Please ensure all fields marked with * (Merchant, Amount, Currency, Date, Issue) are filled correctly before proceeding.",
    copied: "Letter copied to clipboard!",
    noDataSave: "No data to save!",
    templateSaved: "Template saved!",
    confirmClear: "Are you sure you want to clear the chat history?",
    processingFiles: "Processing...",
    autoSaved: "Auto-saved",
    lastSaved: "Last saved:",
    collectedEvidence: "Collected Evidence",
    selectMode: "Select Mode",
    useTemplate: "Quick Templates",
    tplFlight: "✈️ Flight",
    tplHotel: "🏨 Hotel",
    tplMedical: "🏥 Medical",
    tplGeneral: "📝 General"
  },
  zh: {
    title: "多智能体退款助手",
    subtitle: "您的专属AI法律团队。我们帮您争取旅行退款，让您无后顾之忧。",
    startNew: "开始新案件",
    startZh: "🇨🇳 开启中文服务",
    history: "历史记录",
    searchPlaceholder: "搜索商家、日期或金额...",
    evidenceDashboard: "证据面板",
    evidenceSubtitle: "选择添加证据的方式：",
    files: "文件与链接",
    voice: "语音录入",
    notes: "手动备注",
    analyze: "开始分析证据 ➔",
    processing: "处理中...",
    processingSub: "智能体正在审核您的证据。",
    analysisComplete: "分析完成",
    analysisSub: "以下是案件摘要和法律评估。请修正任何缺失的细节。",
    saveTemplate: "💾 保存为模板",
    merchant: "商家名称",
    emailPlaceholder: "support@example.com",
    merchantEmail: "商家邮箱",
    amount: "金额",
    currency: "货币",
    date: "日期",
    reference: "参考号 / PNR",
    issue: "问题描述",
    verifiedSources: "已验证来源",
    expertOpinion: "专家意见",
    update: "更新",
    probability: "成功概率",
    likely: "退款可能性大",
    challenging: "具有挑战性",
    keyArgument: "关键论点",
    strategy: "策略",
    generate: "✓ 生成申诉信",
    back: "← 返回",
    drafting: "撰写中...",
    letterReady: "申诉信已就绪！",
    letterSub: "您的专业申诉信已准备好发送。",
    copy: "📋 复制",
    download: "⬇️ 下载",
    draftEmail: "✉️ 起草邮件",
    new: "🔄 新案件",
    error: "错误",
    retry: "重试",
    dismiss: "忽略",
    templateStart: "从模板开始",
    noItems: "暂无项目",
    recording: "正在录音...",
    tapRecord: "点击录音",
    recordHint: "口述您的情况，我们将为您转录。",
    dragDrop: "拖放或点击",
    pasteLink: "粘贴链接 (https://...)",
    micAccess: "麦克风访问被拒绝。请允许麦克风权限。",
    speechUnsupport: "此浏览器不支持语音识别。",
    provideEvidence: "请提供一些证据（照片、PDF、音频）或详细描述。",
    agentError: "我们的智能体在处理您的请求时遇到问题。",
    requiredFields: "请确保所有标有 * 的字段（商家、金额、货币、日期、问题）已正确填写。",
    copied: "信件已复制到剪贴板！",
    noDataSave: "没有数据可保存！",
    templateSaved: "模板已保存！",
    confirmClear: "您确定要清除聊天记录吗？",
    processingFiles: "处理中...",
    autoSaved: "已自动保存",
    lastSaved: "上次保存：",
    collectedEvidence: "已收集证据",
    selectMode: "选择模式",
    useTemplate: "快速模版",
    tplFlight: "✈️ 航班取消",
    tplHotel: "🏨 酒店问题",
    tplMedical: "🏥 突发就医",
    tplGeneral: "📝 通用退款"
  },
  es: {
    title: "Reembolso Multi-Agentes",
    subtitle: "Su equipo legal personal de IA. Luchamos por sus reembolsos de viaje.",
    startNew: "Iniciar Nuevo Caso",
    startZh: "🇨🇳 开启中文服务",
    history: "Historial de Casos",
    searchPlaceholder: "Buscar por comerciante, fecha o monto...",
    evidenceDashboard: "Panel de Evidencia",
    evidenceSubtitle: "Elija cómo agregar evidencia:",
    files: "Archivos y Enlaces",
    voice: "Grabación de Voz",
    notes: "Notas Manuales",
    analyze: "Analizar Evidencia ➔",
    processing: "Procesando...",
    processingSub: "Nuestros agentes están revisando su evidencia.",
    analysisComplete: "Análisis Completo",
    analysisSub: "Aquí está el resumen y nuestra evaluación legal. Por favor corrija los detalles faltantes.",
    saveTemplate: "💾 Guardar como Plantilla",
    merchant: "Comerciante",
    emailPlaceholder: "soporte@ejemplo.com",
    merchantEmail: "Email del Comerciante",
    amount: "Monto",
    currency: "Moneda",
    date: "Fecha",
    reference: "Referencia / PNR",
    issue: "Descripción del Problema",
    verifiedSources: "Fuentes Verificadas",
    expertOpinion: "Opinión Experta",
    update: "Actualizar",
    probability: "Probabilidad",
    likely: "Reembolso Probable",
    challenging: "Caso Desafiante",
    keyArgument: "Argumento Clave",
    strategy: "Estrategia",
    generate: "✓ Generar Carta",
    back: "← Volver",
    drafting: "Redactando...",
    letterReady: "¡Carta Lista!",
    letterSub: "Su carta de apelación profesional está lista.",
    copy: "📋 Copiar",
    download: "⬇️ Descargar",
    draftEmail: "✉️ Redactar Email",
    new: "🔄 Nuevo",
    error: "Error",
    retry: "Reintentar",
    dismiss: "Descartar",
    templateStart: "Iniciar desde Plantilla",
    noItems: "Sin ítems",
    recording: "Grabando...",
    tapRecord: "Tocar para Grabar",
    recordHint: "Explique su situación verbalmente.",
    dragDrop: "Arrastrar o Clic",
    pasteLink: "Pegar Enlace (https://...)",
    micAccess: "Acceso al micrófono denegado.",
    speechUnsupport: "Reconocimiento de voz no soportado.",
    provideEvidence: "Por favor proporcione evidencia (Foto, PDF, Audio) o descripción.",
    agentError: "Nuestros agentes encontraron un problema.",
    requiredFields: "Por favor complete los campos obligatorios *.",
    copied: "¡Carta copiada al portapapeles!",
    noDataSave: "¡No hay datos para guardar!",
    templateSaved: "¡Plantilla guardada!",
    confirmClear: "¿Está seguro de borrar el historial?",
    processingFiles: "Procesando...",
    autoSaved: "Autoguardado",
    lastSaved: "Último guardado:",
    collectedEvidence: "Evidencia Recopilada",
    selectMode: "Seleccionar Modo",
    useTemplate: "Plantillas Rápidas",
    tplFlight: "✈️ Vuelo",
    tplHotel: "🏨 Hotel",
    tplMedical: "🏥 Médico",
    tplGeneral: "📝 General"
  }
};

const App: React.FC = () => {
  // State
  const [step, setStep] = useState<RefundStep>(RefundStep.WELCOME);
  const [caseData, setCaseData] = useState<RefundCase>({
    id: crypto.randomUUID(),
    userLanguage: 'en',
    evidenceFiles: [],
    userNotes: '',
  });
  const [history, setHistory] = useState<RefundCase[]>([]);
  const [templates, setTemplates] = useState<RefundTemplate[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  
  // Accessibility State
  const [fontSizePercent, setFontSizePercent] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [appLanguage, setAppLanguage] = useState<'en'|'zh'|'es'>('en');

  // Error Handling State
  const [error, setError] = useState<string | null>(null);
  const [errorContext, setErrorContext] = useState<'ANALYSIS' | 'LETTER' | 'UPDATE_POLICY' | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  
  const [urlInput, setUrlInput] = useState('');
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);
  
  // Upload UI State
  const [uploadMode, setUploadMode] = useState<'files'|'voice'|'notes'>('files');

  // Auto-Save State
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<number | null>(null);
  const caseDataRef = useRef(caseData);
  const lastSavedSnapshotRef = useRef<string>('');

  // UI States
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  
  // Recording & Dictation State
  const [isRecording, setIsRecording] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // Agent States
  const [agent1Status, setAgent1Status] = useState<'waiting'|'active'|'done'>('waiting');
  const [agent2Status, setAgent2Status] = useState<'waiting'|'active'|'done'>('waiting');
  const [agent3Status, setAgent3Status] = useState<'waiting'|'active'|'done'>('waiting');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Translation Helper
  const t = TRANSLATIONS[appLanguage];

  // Update refs when state changes for auto-save
  useEffect(() => {
    caseDataRef.current = caseData;
  }, [caseData]);

  // Apply Font Size Effect
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSizePercent}%`;
  }, [fontSizePercent]);

  // Load history and templates on mount
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
      }
    };
    initData();
  }, []);

  // Auto-Save Interval
  useEffect(() => {
    const interval = setInterval(async () => {
      const current = caseDataRef.current;
      
      // Don't auto-save if we are just at the welcome screen with no data
      const hasContent = current.evidenceFiles.length > 0 || current.userNotes.trim().length > 0 || current.extractedData;
      // Also simple check to see if we are "working" on it
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
            console.log("Auto-saving case:", current.id);
            try {
                await saveToHistory(current);
                setLastAutoSaveTime(Date.now());
                lastSavedSnapshotRef.current = snapshot;
            } catch (e) {
                console.error("Auto-save failed", e);
            }
        }
      }
    }, AUTO_SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [step]); 

  const updateLanguage = (lang: 'en'|'zh'|'es') => {
      setAppLanguage(lang);
      if (step === RefundStep.WELCOME || step === RefundStep.UPLOAD_EVIDENCE) {
          setCaseData(prev => ({ ...prev, userLanguage: lang }));
      }
  };

  const txtColor = (defaultColor: string) => highContrast ? 'text-black' : defaultColor;
  const txtSubColor = (defaultColor: string) => highContrast ? 'text-slate-900 font-medium' : defaultColor;
  const bgSoft = (defaultColor: string) => highContrast ? 'bg-white border-2 border-black' : defaultColor;

  const saveToHistory = async (currentCase: RefundCase) => {
    try {
      const caseToSave = { ...currentCase, createdAt: currentCase.createdAt || Date.now() };
      setHistory(prev => {
        const filtered = prev.filter(c => c.id !== caseToSave.id);
        return [caseToSave, ...filtered];
      });
      await saveCaseToDB(caseToSave);
    } catch (e) {
      console.error("Failed to save history to DB", e);
      throw e; 
    }
  };

  const deleteFromHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newHistory = history.filter(c => c.id !== id);
      setHistory(newHistory);
      await deleteCaseFromDB(id);
    } catch (e) {
      console.error("Failed to delete from DB", e);
    }
  };

  const saveAsTemplate = async () => {
    const name = prompt("Enter a name for this template:");
    if (!name) return;

    if (!caseData.extractedData && !caseData.userNotes) {
      alert(t.noDataSave);
      return;
    }

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

    try {
      await saveTemplateToDB(template);
      setTemplates(prev => [template, ...prev]);
      alert(t.templateSaved);
    } catch (e) {
      console.error("Failed to save template", e);
      alert(t.error);
    }
  };

  const deleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteTemplateFromDB(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error("Failed to delete template", e);
    }
  };

  const startFromTemplate = (template: RefundTemplate) => {
    const newCase: RefundCase = {
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
    };

    setCaseData(newCase);
    setError(null);
    setErrorContext(null);
    setStep(RefundStep.REVIEW_ANALYSIS);
    setAgent1Status('done'); 
    setAgent2Status('waiting'); 
    setAgent3Status('waiting');
  };

  const loadCase = (savedCase: RefundCase) => {
    setCaseData(savedCase);
    setError(null);
    setErrorContext(null);
    
    if (savedCase.generatedLetter) {
      setStep(RefundStep.FINAL_LETTER);
      setAgent1Status('done');
      setAgent2Status('done');
      setAgent3Status('done');
    } else if (savedCase.policyAnalysis) {
      setStep(RefundStep.REVIEW_ANALYSIS);
      setAgent1Status('done');
      setAgent2Status('done');
    } else {
      setStep(RefundStep.UPLOAD_EVIDENCE);
    }
  };

  const updateExtractedData = (field: keyof ExtractedEvidence, value: string) => {
    setCaseData(prev => {
      if (!prev.extractedData) return prev;
      return {
        ...prev,
        extractedData: {
          ...prev.extractedData,
          [field]: value
        }
      };
    });
  };

  const applyTemplate = (text: string) => {
      setCaseData(prev => {
          const current = prev.userNotes.trim();
          return {
              ...prev,
              userNotes: current ? current + "\n\n" + text : text
          };
      });
  };

  // Helper: Process Files with Progress
  const processFiles = (files: FileList | File[]) => {
    setUploadWarning(null);
    setIsProcessingFiles(true);

    const fileArray = Array.from(files);
    const validFilesToProcess: File[] = [];
    const oversizedFiles: string[] = [];

    fileArray.forEach(file => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversizedFiles.push(file.name);
      } else {
        validFilesToProcess.push(file);
      }
    });

    if (oversizedFiles.length > 0) {
      setUploadWarning(`Skipped ${oversizedFiles.length} file(s) exceeding ${MAX_FILE_SIZE_MB}MB limit: ${oversizedFiles.join(', ')}`);
    }

    if (validFilesToProcess.length === 0) {
      setIsProcessingFiles(false);
      return;
    }

    // Create initial entries with instant preview (using createObjectURL)
    const newEntries: EvidenceFile[] = validFilesToProcess.map(file => {
        let fileType: 'image' | 'pdf' | 'audio' | 'video' = 'image';
        if (file.type.includes('pdf')) fileType = 'pdf';
        if (file.type.includes('audio')) fileType = 'audio';
        if (file.type.includes('video')) fileType = 'video';
        
        return {
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file), // Immediate preview
          base64: '',
          mimeType: file.type,
          type: fileType,
          name: file.name,
          uploadStatus: 'processing',
          uploadProgress: 0
        };
    });

    // Add to state
    setCaseData(prev => ({
      ...prev,
      evidenceFiles: [...prev.evidenceFiles, ...newEntries]
    }));

    // Start reading
    let finishedCount = 0;
    const checkFinished = () => {
        finishedCount++;
        if (finishedCount === validFilesToProcess.length) {
            setIsProcessingFiles(false);
        }
    };

    newEntries.forEach(entry => {
        const reader = new FileReader();
        
        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                setCaseData(prev => ({
                    ...prev,
                    evidenceFiles: prev.evidenceFiles.map(f => 
                        f.id === entry.id ? { ...f, uploadProgress: percent } : f
                    )
                }));
            }
        };

        reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result) {
                const base64 = result.split(',')[1];
                setCaseData(prev => ({
                    ...prev,
                    evidenceFiles: prev.evidenceFiles.map(f => 
                        f.id === entry.id ? { ...f, base64, uploadStatus: 'done', uploadProgress: 100 } : f
                    )
                }));
            }
            checkFinished();
        };

        reader.onerror = () => {
             setCaseData(prev => ({
                    ...prev,
                    evidenceFiles: prev.evidenceFiles.map(f => 
                        f.id === entry.id ? { ...f, uploadStatus: 'error' } : f
                    )
                }));
             checkFinished();
        };

        reader.readAsDataURL(entry.file!);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const newFile: EvidenceFile = {
      id: crypto.randomUUID(),
      preview: '', 
      mimeType: 'text/uri-list',
      type: 'url',
      name: urlInput.trim(),
      uploadStatus: 'done',
      uploadProgress: 100
    };

    setCaseData(prev => ({
      ...prev,
      evidenceFiles: [...prev.evidenceFiles, newFile]
    }));
    setUrlInput('');
  };

  const removeFile = (id: string) => {
    setCaseData(prev => ({
      ...prev,
      evidenceFiles: prev.evidenceFiles.filter(f => f.id !== id)
    }));
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' }); 
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            const newFile: EvidenceFile = {
              id: crypto.randomUUID(),
              preview: URL.createObjectURL(audioBlob),
              base64: base64String,
              mimeType: 'audio/mp3', 
              type: 'audio',
              name: `Voice Record ${new Date().toLocaleTimeString()}`,
              uploadStatus: 'done',
              uploadProgress: 100
            };
            setCaseData(prev => ({
              ...prev,
              evidenceFiles: [...prev.evidenceFiles, newFile]
            }));
            
            stream.getTracks().forEach(track => track.stop());
          };
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Mic access denied", err);
        alert(t.micAccess);
      }
    }
  };

  const toggleDictation = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert(t.speechUnsupport);
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = appLanguage === 'zh' ? 'zh-CN' : 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
           setCaseData(prev => ({...prev, userNotes: prev.userNotes + ' ' + finalTranscript}));
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error("Dictation error", event.error);
        setIsDictating(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsDictating(true);
    }
  };

  const dismissError = () => {
    setError(null);
    setErrorContext(null);
  };

  const retryOperation = () => {
    dismissError();
    if (errorContext === 'ANALYSIS') startAnalysis();
    if (errorContext === 'LETTER') generateFinalLetter();
    if (errorContext === 'UPDATE_POLICY') handleReAnalyzePolicy();
  };

  const startAnalysis = async () => {
    if (caseData.evidenceFiles.length === 0 && caseData.userNotes.trim().length < 10) {
      setError(t.provideEvidence);
      return;
    }
    
    setError(null);
    setErrorContext(null);
    
    setStep(RefundStep.PROCESSING);

    try {
      setAgent1Status('active');
      const evidence = await extractEvidenceAgent(
        caseData.evidenceFiles,
        caseData.userNotes,
        useGoogleSearch
      );
      setCaseData(prev => ({ ...prev, extractedData: evidence }));
      setAgent1Status('done');

      setAgent2Status('active');
      const analysis = await policyAnalysisAgent(evidence);
      setCaseData(prev => ({ ...prev, policyAnalysis: analysis }));
      setAgent2Status('done');
      
      setStep(RefundStep.REVIEW_ANALYSIS);

    } catch (err: any) {
      console.error(err);
      
      let msg = t.agentError;
      if (err.message && (err.message.includes("SAFETY") || err.message.includes("blocked"))) {
          msg = "Content flagged by safety filters.";
      } else if (err.message && (err.message.includes("429") || err.message.includes("quota"))) {
          msg = "High traffic. Please wait a moment.";
      }

      setError(msg);
      setErrorContext('ANALYSIS');
      
      setStep(RefundStep.UPLOAD_EVIDENCE);
      setAgent1Status('waiting');
      setAgent2Status('waiting');
    }
  };

  const handleReAnalyzePolicy = async () => {
      if (!caseData.extractedData) return;
      
      setIsReAnalyzing(true);
      setError(null);
      setErrorContext(null);
      
      try {
        const analysis = await policyAnalysisAgent(caseData.extractedData);
        setCaseData(prev => ({ ...prev, policyAnalysis: analysis }));
      } catch (err) {
        console.error(err);
        setError("Failed to refresh. Try again.");
        setErrorContext('UPDATE_POLICY');
      } finally {
        setIsReAnalyzing(false);
      }
  };

  const generateFinalLetter = async () => {
    if (!caseData.extractedData || !caseData.policyAnalysis) return;

    const { merchantName, amount, currency, transactionDate, issueDescription } = caseData.extractedData;
    if (!merchantName?.trim() || !amount?.trim() || !currency?.trim() || !transactionDate?.trim() || !issueDescription?.trim()) {
      setError(t.requiredFields);
      return;
    }
    
    setError(null);
    setErrorContext(null);

    setStep(RefundStep.GENERATING_LETTER);
    setAgent3Status('active');

    try {
      const letter = await letterGeneratorAgent(
        caseData.extractedData,
        caseData.policyAnalysis,
        caseData.userLanguage
      );
      
      setCaseData(prev => {
        const updated = { ...prev, generatedLetter: letter };
        saveToHistory(updated);
        return updated;
      });
      
      setAgent3Status('done');
      setStep(RefundStep.FINAL_LETTER);
    } catch (err) {
      console.error(err);
      setError("Failed to generate letter. AI busy.");
      setErrorContext('LETTER');
      setStep(RefundStep.REVIEW_ANALYSIS);
      setAgent3Status('waiting');
    }
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
  };

  const draftEmail = () => {
      if (!caseData.generatedLetter || !caseData.extractedData) return;
      const recipient = caseData.extractedData.merchantEmail || '';
      const subject = encodeURIComponent(`Refund Request - ${caseData.extractedData.bookingReference || 'Transaction'}`);
      const body = encodeURIComponent(caseData.generatedLetter);
      window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

  const renderWelcome = () => {
    const filteredHistory = history.filter(item => {
        const term = historySearch.toLowerCase();
        const name = (item.extractedData?.merchantName || item.evidenceFiles[0]?.name || "Untitled Case").toLowerCase();
        const date = new Date(item.createdAt || Date.now()).toLocaleDateString().toLowerCase();
        const amount = item.extractedData?.amount?.toLowerCase() || '';
        return name.includes(term) || date.includes(term) || amount.includes(term);
    });

    return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-10 animate-pop-in py-10">
      <div className="relative group cursor-default text-center">
         <div className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-300 rounded-full blur-xl opacity-60 animate-pulse"></div>
         <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-300 rounded-full blur-xl opacity-60 animate-pulse delay-700"></div>
         
         <div className={`inline-block bg-gradient-to-br from-white to-blue-50 p-8 rounded-[2rem] shadow-3d-card transform transition-transform hover:scale-105 duration-300 relative z-10 ${highContrast ? 'border-4 border-black' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-blue-600 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
         </div>
      </div>
      
      <div className="space-y-4 text-center">
        <h1 className={`text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-sm ${highContrast ? 'text-black' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-500'}`}>
          {t.title}
        </h1>
        <p className={`text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed font-medium ${txtSubColor('text-slate-600')}`}>
          {t.subtitle}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg">
        <LargeButton onClick={() => {
            setCaseData(prev => ({ id: crypto.randomUUID(), userLanguage: appLanguage, evidenceFiles: [], userNotes: '' }));
            setStep(RefundStep.UPLOAD_EVIDENCE);
        }}>
          {t.startNew}
        </LargeButton>
        <LargeButton variant="secondary" onClick={() => {
             updateLanguage('zh');
             setStep(RefundStep.UPLOAD_EVIDENCE);
        }}>
          {t.startZh}
        </LargeButton>
      </div>

      {/* Templates Section */}
      {templates.length > 0 && (
        <div className="w-full max-w-3xl mt-12 animate-pop-in">
           <div className="flex items-center gap-3 mb-4">
             <div className={`h-px flex-1 ${highContrast ? 'bg-black' : 'bg-slate-300'}`}></div>
             <span className={`${txtColor('text-slate-400')} font-bold uppercase text-sm tracking-wider`}>{t.templateStart}</span>
             <div className={`h-px flex-1 ${highContrast ? 'bg-black' : 'bg-slate-300'}`}></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {templates.map(template => (
              <div 
                key={template.id}
                onClick={() => startFromTemplate(template)}
                className={`bg-white p-4 rounded-xl shadow-sm border hover:shadow-md cursor-pointer transition-all group relative overflow-hidden ${highContrast ? 'border-black' : 'border-slate-200 hover:border-blue-300'}`}
              >
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={(e) => deleteTemplate(template.id, e)}
                     className="text-slate-300 hover:text-red-500"
                   >✕</button>
                </div>
                <div className="flex items-center gap-3 mb-2">
                   <span className="text-2xl">📋</span>
                   <h3 className={`font-bold truncate ${txtColor('text-slate-700')}`}>{template.name}</h3>
                </div>
                <p className={`text-xs line-clamp-2 ${txtSubColor('text-slate-500')}`}>
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
             <div className={`h-px flex-1 ${highContrast ? 'bg-black' : 'bg-slate-300'}`}></div>
             <span className={`${txtColor('text-slate-400')} font-bold uppercase text-sm tracking-wider`}>{t.history}</span>
             <div className={`h-px flex-1 ${highContrast ? 'bg-black' : 'bg-slate-300'}`}></div>
          </div>
          
          {/* Search Bar */}
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
               className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all ${highContrast ? 'text-black border-black placeholder:text-slate-600' : 'text-slate-700 border-slate-200 focus:border-blue-400 placeholder:text-slate-400'}`}
             />
             {historySearch && (
                 <button 
                   onClick={() => setHistorySearch('')}
                   className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                 >
                    ✕
                 </button>
             )}
          </div>
          
          <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className={`bg-white p-4 rounded-xl shadow-sm border hover:shadow-md transition-all cursor-pointer flex justify-between items-center group ${highContrast ? 'border-black' : 'border-slate-200'}`}
                    onClick={() => loadCase(item)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                        item.generatedLetter ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {item.generatedLetter ? '✓' : '📝'}
                      </div>
                      <div>
                        <h4 className={`font-bold ${txtColor('text-slate-800')}`}>
                          {item.extractedData?.merchantName || item.evidenceFiles[0]?.name || "Untitled Case"}
                        </h4>
                        <p className={`text-sm ${txtSubColor('text-slate-500')}`}>
                          {new Date(item.createdAt || Date.now()).toLocaleDateString()} • {item.extractedData?.amount ? `${item.extractedData.amount} ${item.extractedData.currency}` : 'Draft'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 font-bold text-sm px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity">
                        Open
                      </button>
                      <button 
                        onClick={(e) => deleteFromHistory(item.id, e)}
                        className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
            ) : (
                <div className={`text-center py-8 border-2 border-dashed rounded-xl bg-slate-50 ${highContrast ? 'border-black' : 'border-slate-200'}`}>
                   <p className={`${txtColor('text-slate-400')}`}>{t.noItems}</p>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderUpload = () => (
    <div className="max-w-4xl mx-auto animate-pop-in pb-10">
      <div className="text-center mb-8">
        <h2 className={`text-3xl font-bold mb-2 ${txtColor('text-slate-800')}`}>{t.evidenceDashboard}</h2>
      </div>

      {/* Main Input Card */}
      <div className={`bg-white rounded-3xl shadow-3d-card border-2 p-6 md:p-8 mb-8 transition-all relative overflow-hidden flex flex-col min-h-[500px] ${highContrast ? 'border-black' : 'border-white'}`}>
         
         {/* Card Header & Switcher */}
         <div className="flex flex-col md:flex-row justify-between items-center mb-6 pb-6 border-b border-slate-100 gap-4">
            <h3 className={`text-xl font-bold ${txtSubColor('text-slate-500')}`}>{t.evidenceSubtitle}</h3>
            
            <div className="relative z-20">
              <select
                  value={uploadMode}
                  onChange={(e) => setUploadMode(e.target.value as any)}
                  className={`appearance-none pl-4 pr-10 py-3 rounded-xl font-bold text-lg cursor-pointer focus:outline-none transition-all shadow-sm ${
                      uploadMode === 'files' ? 'bg-blue-50 text-blue-700 border-2 border-blue-200' :
                      uploadMode === 'voice' ? 'bg-red-50 text-red-700 border-2 border-red-200' :
                      'bg-yellow-50 text-yellow-700 border-2 border-yellow-200'
                  }`}
              >
                  <option value="files">📁 {t.files}</option>
                  <option value="voice">🎙️ {t.voice}</option>
                  <option value="notes">✍️ {t.notes}</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
         </div>

         {/* Content Area */}
         <div className="flex-1 flex flex-col relative">
            
            {/* MODE: FILES */}
            {uploadMode === 'files' && (
                <div 
                   className={`flex-1 flex flex-col animate-pop-in`}
                   onDragOver={handleDragOver}
                   onDragLeave={handleDragLeave}
                   onDrop={handleDrop}
                >
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex-1 border-4 border-dashed rounded-3xl transition-all cursor-pointer p-6 text-center group flex flex-col items-center justify-center min-h-[300px] relative mb-6 ${
                            isDragging ? 'border-blue-500 bg-blue-50' : `bg-slate-50 hover:bg-blue-50 ${highContrast ? 'border-black' : 'border-blue-100'}`
                        }`}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/*,application/pdf,audio/*,video/*"
                            multiple
                            onChange={handleFileSelect}
                        />
                        
                        {isProcessingFiles && caseData.evidenceFiles.every(f => !f.uploadStatus || f.uploadStatus === 'done') ? (
                            <div className="flex flex-col items-center animate-pulse">
                                <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-sm font-bold text-blue-600">{t.processingFiles}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center pointer-events-none">
                                <div className="w-20 h-20 bg-white rounded-full shadow-md flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <span className="text-blue-500 text-4xl font-bold">+</span>
                                </div>
                                <h4 className={`text-xl font-bold mb-2 ${txtColor('text-slate-700')}`}>{t.dragDrop}</h4>
                                <p className={`text-sm ${txtSubColor('text-slate-400')}`}>Images, PDF, Audio, Video (Max {MAX_FILE_SIZE_MB}MB)</p>
                            </div>
                        )}
                        
                        {uploadWarning && (
                            <div className="absolute bottom-4 left-0 right-0 mx-4 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-bold animate-pulse">
                                ⚠️ {uploadWarning}
                            </div>
                        )}
                    </div>
                    
                    <form onSubmit={handleAddUrl} className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔗</span>
                            <input 
                                type="url" 
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder={t.pasteLink}
                                className={`w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm border-2 focus:outline-none focus:border-blue-400 focus:bg-white transition-all ${highContrast ? 'text-black border-black' : 'border-slate-100'}`}
                            />
                        </div>
                        <LargeButton type="submit" className="w-auto px-6 py-2 text-sm" disabled={!urlInput.trim()}>
                            Add
                        </LargeButton>
                    </form>
                </div>
            )}

            {/* MODE: VOICE */}
            {uploadMode === 'voice' && (
                <div className="flex-1 flex flex-col items-center justify-center animate-pop-in relative">
                    {/* Ripple Effect Background */}
                    {isRecording && (
                        <>
                        <div className="absolute w-60 h-60 bg-red-100 rounded-full animate-ping opacity-75"></div>
                        <div className="absolute w-80 h-80 bg-red-50 rounded-full animate-pulse opacity-50"></div>
                        </>
                    )}

                    <Tooltip content={isRecording ? "Click to Stop" : "Click to Start Recording"}>
                        <button 
                            onClick={toggleRecording}
                            className={`w-40 h-40 rounded-full flex items-center justify-center shadow-3d-btn transition-transform z-10 border-8 ${
                                isRecording 
                                ? 'bg-red-500 border-red-100 scale-110' 
                                : 'bg-gradient-to-b from-white to-slate-50 border-slate-100 hover:border-red-50'
                            }`}
                            >
                            {isRecording ? (
                                <div className="w-12 h-12 bg-white rounded-lg shadow-sm"></div>
                            ) : (
                                <div className="w-12 h-12 bg-red-500 rounded-full shadow-inner"></div>
                            )}
                        </button>
                    </Tooltip>

                    <p className={`mt-10 font-bold text-2xl transition-colors ${isRecording ? 'text-red-500 animate-pulse' : txtColor('text-slate-400')}`}>
                        {isRecording ? t.recording : t.tapRecord}
                    </p>
                    
                    <p className="text-slate-400 font-medium mt-3 text-center max-w-xs">
                        {t.recordHint}
                    </p>
                </div>
            )}

            {/* MODE: NOTES */}
            {uploadMode === 'notes' && (
                <div className="flex-1 flex flex-col animate-pop-in relative h-full">
                    {/* Quick Templates Selection */}
                    <div className="flex flex-wrap items-center gap-2 mb-4 px-1">
                        <span className={`text-xs font-bold uppercase tracking-wider ${txtColor('text-slate-400')}`}>
                            {t.useTemplate}:
                        </span>
                        <button 
                            onClick={() => applyTemplate(NOTE_TEMPLATES[appLanguage].flight)}
                            className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-full text-xs font-bold transition-colors border border-yellow-200"
                        >
                            {t.tplFlight}
                        </button>
                        <button 
                            onClick={() => applyTemplate(NOTE_TEMPLATES[appLanguage].hotel)}
                            className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-full text-xs font-bold transition-colors border border-yellow-200"
                        >
                            {t.tplHotel}
                        </button>
                        <button 
                            onClick={() => applyTemplate(NOTE_TEMPLATES[appLanguage].medical)}
                            className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-full text-xs font-bold transition-colors border border-yellow-200"
                        >
                            {t.tplMedical}
                        </button>
                        <button 
                            onClick={() => applyTemplate(NOTE_TEMPLATES[appLanguage].other)}
                            className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-full text-xs font-bold transition-colors border border-yellow-200"
                        >
                            {t.tplGeneral}
                        </button>
                    </div>

                    <textarea
                        className={`w-full flex-1 p-6 bg-yellow-50/50 border-2 rounded-2xl text-xl shadow-inner-depth focus:bg-white focus:ring-4 focus:ring-yellow-100 focus:border-yellow-200 outline-none resize-none transition-all leading-relaxed ${highContrast ? 'text-black border-black placeholder:text-slate-700' : 'text-slate-700 border-yellow-100/50 placeholder:text-slate-400'}`}
                        placeholder="Type additional details here... or use a template above to get started."
                        value={caseData.userNotes}
                        onChange={(e) => setCaseData(prev => ({...prev, userNotes: e.target.value}))}
                        style={{ minHeight: '300px' }}
                    />
                    
                    {/* Dictation Button Floating */}
                    <Tooltip content="Use microphone to type text" position="left">
                        <button 
                            onClick={toggleDictation}
                            className={`absolute bottom-6 right-6 p-4 rounded-xl shadow-lg transition-all border border-yellow-200 ${
                                isDictating ? 'bg-yellow-500 text-white animate-bounce' : 'bg-white text-yellow-600 hover:bg-yellow-50'
                            }`}
                            >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </button>
                    </Tooltip>
                </div>
            )}
         </div>
      </div>

      {/* COLLECTED EVIDENCE SUMMARY LIST */}
      {(caseData.evidenceFiles.length > 0 || caseData.userNotes.trim().length > 0) && (
        <div className={`bg-slate-50 rounded-3xl border-2 p-6 animate-pop-in mb-8 ${highContrast ? 'border-black' : 'border-slate-200'}`}>
           <h3 className="font-bold text-slate-500 uppercase tracking-wider mb-4 text-sm flex items-center gap-2">
              <span>🗂️</span> {t.collectedEvidence}
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Files */}
              {caseData.evidenceFiles.map((file) => (
                <div key={file.id} className={`flex items-center gap-3 bg-white p-3 rounded-xl border relative group hover:shadow-md transition-shadow ${highContrast ? 'border-black' : 'border-slate-100'}`}>
                   <div className="w-10 h-10 rounded-lg bg-slate-100 shadow-sm flex-shrink-0 overflow-hidden flex items-center justify-center text-lg">
                      {file.type === 'image' && file.preview && <img src={file.preview} className="w-full h-full object-cover" />}
                      {file.type === 'pdf' && <span className="text-red-500">📄</span>}
                      {file.type === 'audio' && <span className="text-purple-500">🎙️</span>}
                      {file.type === 'video' && <span className="text-blue-500">🎬</span>}
                      {file.type === 'url' && <span className="text-slate-500">🔗</span>}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${txtColor('text-slate-700')}`} title={file.name}>{file.name}</p>
                      
                      {file.uploadStatus === 'processing' ? (
                          <div className="w-full mt-1">
                            <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                                <div className="bg-blue-500 h-full transition-all" style={{ width: `${file.uploadProgress || 0}%` }}></div>
                            </div>
                          </div>
                      ) : (
                          <span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-500 uppercase font-bold tracking-wide">{file.type}</span>
                      )}
                   </div>
                   <button 
                     onClick={() => removeFile(file.id)}
                     className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white flex items-center justify-center text-xs transition-colors"
                   >
                     ✕
                   </button>
                </div>
              ))}

              {/* Notes Summary Item */}
              {caseData.userNotes.trim().length > 0 && (
                  <div 
                    onClick={() => setUploadMode('notes')}
                    className={`flex items-center gap-3 bg-yellow-50 p-3 rounded-xl border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors group relative`}
                  >
                     <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex-shrink-0 flex items-center justify-center text-lg">
                        ✍️
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${txtColor('text-slate-700')}`}>Manual Notes</p>
                        <p className="text-[10px] text-slate-500 truncate opacity-70">
                            {caseData.userNotes.substring(0, 30)}...
                        </p>
                     </div>
                     <div className="opacity-0 group-hover:opacity-100 text-xs font-bold text-yellow-600 bg-white px-2 py-1 rounded">Edit</div>
                  </div>
              )}
           </div>
        </div>
      )}

      <div className="flex justify-center">
        <Tooltip content="Process all uploaded evidence and notes">
            <LargeButton 
              className="w-full md:w-2/3 shadow-2xl"
              onClick={startAnalysis}
              disabled={caseData.evidenceFiles.length === 0 && caseData.userNotes.trim().length === 0}
            >
              {t.analyze}
            </LargeButton>
        </Tooltip>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans selection:bg-blue-200 selection:text-blue-900 ${highContrast ? 'bg-white' : 'bg-[#FDFDFD]'}`}>
      
      {/* Accessibility Controls */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
         {/* ... font size and contrast toggles ... */}
      </div>

      <div className="container mx-auto px-4 py-6 md:py-10 max-w-6xl">
         {step !== RefundStep.WELCOME && (
            <div className="mb-8 flex items-center justify-between">
                <button 
                  onClick={() => setStep(RefundStep.WELCOME)}
                  className={`flex items-center gap-2 font-bold ${txtSubColor('text-slate-400 hover:text-slate-600')}`}
                >
                   {t.back}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => updateLanguage('en')} className={`text-xl ${appLanguage==='en'?'opacity-100':'opacity-40 grayscale'}`}>🇺🇸</button>
                  <button onClick={() => updateLanguage('zh')} className={`text-xl ${appLanguage==='zh'?'opacity-100':'opacity-40 grayscale'}`}>🇨🇳</button>
                  <button onClick={() => updateLanguage('es')} className={`text-xl ${appLanguage==='es'?'opacity-100':'opacity-40 grayscale'}`}>🇪🇸</button>
                </div>
            </div>
         )}
         
         <StepWizard currentStep={step} language={appLanguage} />

         {/* Error Banner */}
         {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6 flex items-center justify-between animate-shake">
                <div className="flex items-center gap-3 text-red-700 font-bold">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <p>{error}</p>
                        {errorContext && (
                            <button onClick={retryOperation} className="text-sm underline mt-1 hover:text-red-900">{t.retry}</button>
                        )}
                    </div>
                </div>
                <button onClick={dismissError} className="text-red-400 hover:text-red-600 font-bold px-3">✕</button>
            </div>
         )}

         {step === RefundStep.WELCOME && renderWelcome()}
         {step === RefundStep.UPLOAD_EVIDENCE && renderUpload()}
         
         {(step === RefundStep.PROCESSING || step === RefundStep.REVIEW_ANALYSIS || step === RefundStep.GENERATING_LETTER) && (
             <div className="max-w-4xl mx-auto animate-pop-in">
                 {/* Agents Section */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                     <div className="space-y-4">
                        <AgentCard 
                            name="Sherlock" 
                            role="Evidence Extractor" 
                            status={agent1Status} 
                            message={agent1Status === 'active' ? "Reading documents..." : agent1Status === 'done' ? "Data extracted." : "Waiting..."} 
                        />
                        <AgentCard 
                            name="Watson" 
                            role="Policy Analyst" 
                            status={agent2Status} 
                            message={agent2Status === 'active' ? "Checking refund laws..." : agent2Status === 'done' ? (caseData.policyAnalysis?.isLikelyRefundable ? t.likely : t.challenging) : "Waiting..."} 
                        />
                     </div>
                     
                     {/* Extracted Data Form (Editable) */}
                     {step === RefundStep.REVIEW_ANALYSIS && caseData.extractedData && (
                        <div className={`bg-white p-6 rounded-3xl shadow-3d-card border-2 ${highContrast ? 'border-black' : 'border-white'}`}>
                            <h3 className={`font-bold text-lg mb-4 ${txtColor('text-slate-700')}`}>Case Details (Editable)</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">{t.merchant} *</label>
                                    <input 
                                        value={caseData.extractedData.merchantName} 
                                        onChange={(e) => updateExtractedData('merchantName', e.target.value)}
                                        className="w-full font-bold text-lg border-b-2 border-slate-100 focus:border-blue-500 outline-none py-1 bg-transparent" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">{t.amount} *</label>
                                        <input 
                                            value={caseData.extractedData.amount} 
                                            onChange={(e) => updateExtractedData('amount', e.target.value)}
                                            className="w-full font-bold text-lg border-b-2 border-slate-100 focus:border-blue-500 outline-none py-1 bg-transparent" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase">{t.currency} *</label>
                                        <input 
                                            value={caseData.extractedData.currency} 
                                            onChange={(e) => updateExtractedData('currency', e.target.value)}
                                            className="w-full font-bold text-lg border-b-2 border-slate-100 focus:border-blue-500 outline-none py-1 bg-transparent" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">{t.date} *</label>
                                    <input 
                                        value={caseData.extractedData.transactionDate} 
                                        onChange={(e) => updateExtractedData('transactionDate', e.target.value)}
                                        className="w-full font-bold text-lg border-b-2 border-slate-100 focus:border-blue-500 outline-none py-1 bg-transparent" 
                                        type="date"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">{t.issue} *</label>
                                    <textarea 
                                        value={caseData.extractedData.issueDescription} 
                                        onChange={(e) => updateExtractedData('issueDescription', e.target.value)}
                                        className="w-full font-medium text-base border-2 border-slate-100 rounded-lg p-2 focus:border-blue-500 outline-none bg-transparent h-24 resize-none mt-1" 
                                    />
                                </div>
                            </div>
                        </div>
                     )}
                 </div>

                 {/* Analysis Result */}
                 {step === RefundStep.REVIEW_ANALYSIS && caseData.policyAnalysis && (
                     <div className="animate-pop-in">
                        <div className={`p-6 rounded-3xl mb-8 border-l-8 ${caseData.policyAnalysis.isLikelyRefundable ? 'bg-green-50 border-green-500 text-green-900' : 'bg-orange-50 border-orange-500 text-orange-900'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-xl">{t.expertOpinion}</h3>
                                <div className="text-right">
                                    <span className="text-3xl font-black">{caseData.policyAnalysis.refundProbabilityScore}%</span>
                                    <p className="text-xs font-bold uppercase opacity-70">{t.probability}</p>
                                </div>
                            </div>
                            <p className="font-medium text-lg mb-4">{caseData.policyAnalysis.strategySuggestion}</p>
                            
                            <div className="bg-white/50 p-4 rounded-xl">
                                <span className="text-xs font-bold uppercase opacity-60 block mb-1">{t.keyArgument}</span>
                                <p className="font-bold italic">"{caseData.policyAnalysis.keyPolicyClause}"</p>
                            </div>
                            
                            {/* Refresh Button */}
                            <div className="mt-4 flex justify-end">
                                <button 
                                    onClick={handleReAnalyzePolicy}
                                    disabled={isReAnalyzing}
                                    className="text-sm font-bold underline opacity-60 hover:opacity-100 flex items-center gap-1"
                                >
                                   {isReAnalyzing ? '...' : t.update}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4">
                             <LargeButton variant="secondary" onClick={saveAsTemplate} className="flex-1">
                                {t.saveTemplate}
                             </LargeButton>
                             <LargeButton variant="success" onClick={generateFinalLetter} className="flex-[2]">
                                {t.generate}
                             </LargeButton>
                        </div>
                     </div>
                 )}
                 
                 {/* Loading Letter State */}
                 {step === RefundStep.GENERATING_LETTER && (
                    <div className="mt-8 text-center animate-pulse">
                        <h3 className="text-2xl font-bold text-blue-800">{t.drafting}</h3>
                        <p className="text-blue-500">{t.letterSub}</p>
                    </div>
                 )}
             </div>
         )}

         {/* Final Letter Step */}
         {step === RefundStep.FINAL_LETTER && caseData.generatedLetter && (
             <div className="max-w-3xl mx-auto animate-pop-in">
                 <div className="text-center mb-8">
                     <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg">
                        ✓
                     </div>
                     <h2 className={`text-3xl font-bold ${txtColor('text-slate-800')}`}>{t.letterReady}</h2>
                 </div>

                 <div className={`bg-white p-8 rounded-xl shadow-3d-card border-2 relative group ${highContrast ? 'border-black' : 'border-white'}`}>
                     <textarea 
                        className={`w-full h-[500px] resize-none outline-none font-serif text-lg leading-relaxed ${txtColor('text-slate-800')}`}
                        value={caseData.generatedLetter}
                        onChange={(e) => setCaseData({...caseData, generatedLetter: e.target.value})}
                     />
                 </div>

                 <div className="flex flex-col md:flex-row gap-4 mt-8">
                     <LargeButton variant="secondary" onClick={() => {
                         navigator.clipboard.writeText(caseData.generatedLetter || '');
                         alert(t.copied);
                     }}>
                         {t.copy}
                     </LargeButton>
                     <LargeButton variant="secondary" onClick={downloadLetter}>
                         {t.download}
                     </LargeButton>
                     <LargeButton onClick={draftEmail}>
                         {t.draftEmail}
                     </LargeButton>
                 </div>
                 
                 <div className="mt-12 text-center">
                    <button 
                       onClick={() => {
                           setCaseData({ id: crypto.randomUUID(), userLanguage: appLanguage, evidenceFiles: [], userNotes: '' });
                           setStep(RefundStep.WELCOME);
                       }}
                       className="text-slate-400 font-bold hover:text-slate-600"
                    >
                        {t.startNew}
                    </button>
                 </div>
             </div>
         )}

      </div>
      
      <ChatBot />
    </div>
  );
};

export default App;
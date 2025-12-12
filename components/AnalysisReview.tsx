import React from 'react';
import { RefundCase, ExtractedEvidence } from '../types';
import { LargeButton } from './LargeButton';
import { TRANSLATIONS } from '../constants';

interface AnalysisReviewProps {
  caseData: RefundCase;
  onUpdateData: (field: keyof ExtractedEvidence, value: string) => void;
  onReAnalyze: () => void;
  isReAnalyzing: boolean;
  onGenerate: () => void;
  onSaveTemplate: () => void;
  appLanguage: 'en' | 'zh' | 'es';
  themeColor: string;
  highContrast: boolean;
}

export const AnalysisReview: React.FC<AnalysisReviewProps> = ({
  caseData,
  onUpdateData,
  onReAnalyze,
  isReAnalyzing,
  onGenerate,
  onSaveTemplate,
  appLanguage,
  themeColor,
  highContrast
}) => {
  const t = TRANSLATIONS[appLanguage];
  const txtColor = (defaultColor: string) => highContrast ? 'text-black' : defaultColor;

  if (!caseData.extractedData) return null;

  return (
     <div className="max-w-4xl mx-auto animate-pop-in">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             {/* Extracted Data Form (Editable) */}
             <div className={`bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-3d-card border-2 ${highContrast ? 'border-black' : 'border-white dark:border-slate-700'}`}>
                <h3 className={`font-bold text-lg mb-4 ${txtColor('text-slate-700 dark:text-slate-200')}`}>Case Details (Editable)</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">{t.merchant} *</label>
                        <input 
                            value={caseData.extractedData.merchantName} 
                            onChange={(e) => onUpdateData('merchantName', e.target.value)}
                            className={`w-full font-bold text-lg border-b-2 border-slate-100 dark:border-slate-600 focus:border-${themeColor}-500 outline-none py-1 bg-transparent ${txtColor('text-slate-800 dark:text-white')}`}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">{t.merchantEmail}</label>
                        <input 
                            value={caseData.extractedData.merchantEmail || ''} 
                            onChange={(e) => onUpdateData('merchantEmail', e.target.value)}
                            className={`w-full font-medium text-base border-b-2 border-slate-100 dark:border-slate-600 focus:border-${themeColor}-500 outline-none py-1 bg-transparent ${txtColor('text-slate-800 dark:text-white')}`}
                            placeholder={t.emailPlaceholder}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">{t.amount} *</label>
                            <input 
                                value={caseData.extractedData.amount} 
                                onChange={(e) => onUpdateData('amount', e.target.value)}
                                className={`w-full font-bold text-lg border-b-2 border-slate-100 dark:border-slate-600 focus:border-${themeColor}-500 outline-none py-1 bg-transparent ${txtColor('text-slate-800 dark:text-white')}`}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">{t.currency} *</label>
                            <input 
                                value={caseData.extractedData.currency} 
                                onChange={(e) => onUpdateData('currency', e.target.value)}
                                className={`w-full font-bold text-lg border-b-2 border-slate-100 dark:border-slate-600 focus:border-${themeColor}-500 outline-none py-1 bg-transparent ${txtColor('text-slate-800 dark:text-white')}`}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">{t.date} *</label>
                        <input 
                            value={caseData.extractedData.transactionDate} 
                            onChange={(e) => onUpdateData('transactionDate', e.target.value)}
                            className={`w-full font-bold text-lg border-b-2 border-slate-100 dark:border-slate-600 focus:border-${themeColor}-500 outline-none py-1 bg-transparent ${txtColor('text-slate-800 dark:text-white')}`}
                            type="date"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">{t.issue} *</label>
                        <textarea 
                            value={caseData.extractedData.issueDescription} 
                            onChange={(e) => onUpdateData('issueDescription', e.target.value)}
                            className={`w-full font-medium text-base border-2 border-slate-100 dark:border-slate-600 rounded-lg p-2 focus:border-${themeColor}-500 outline-none bg-transparent h-24 resize-none mt-1 ${txtColor('text-slate-800 dark:text-white')}`}
                        />
                    </div>
                </div>
             </div>

             {/* Analysis Result */}
             {caseData.policyAnalysis && (
                 <div className={`p-6 rounded-3xl border-l-8 h-full bg-white dark:bg-slate-800 shadow-3d-card ${highContrast ? 'border-black' : (caseData.policyAnalysis.isLikelyRefundable ? 'border-green-500' : 'border-orange-500')}`}>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className={`font-bold text-xl ${txtColor('text-slate-700 dark:text-slate-200')}`}>{t.expertOpinion}</h3>
                        <div className="text-right">
                            <span className={`text-3xl font-black ${caseData.policyAnalysis.isLikelyRefundable ? 'text-green-600' : 'text-orange-500'}`}>{caseData.policyAnalysis.refundProbabilityScore}%</span>
                            <p className="text-xs font-bold uppercase opacity-70 dark:text-slate-400">{t.probability}</p>
                        </div>
                    </div>
                    <p className={`font-medium text-lg mb-4 ${txtColor('text-slate-600 dark:text-slate-300')}`}>{caseData.policyAnalysis.strategySuggestion}</p>
                    
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl mb-4">
                        <span className="text-xs font-bold uppercase opacity-60 block mb-1 dark:text-slate-400">{t.keyArgument}</span>
                        <p className={`font-bold italic ${txtColor('text-slate-800 dark:text-slate-200')}`}>"{caseData.policyAnalysis.keyPolicyClause}"</p>
                    </div>
                    
                    {/* Refresh Button */}
                    <div className="flex justify-end">
                        <button 
                            onClick={onReAnalyze}
                            disabled={isReAnalyzing}
                            className={`text-sm font-bold underline opacity-60 hover:opacity-100 flex items-center gap-1 ${txtColor('text-slate-600 dark:text-slate-400')}`}
                        >
                           {isReAnalyzing ? '...' : t.update}
                        </button>
                    </div>
                </div>
             )}
         </div>

         <div className="flex gap-4">
             <LargeButton themeColor={themeColor} variant="secondary" onClick={onSaveTemplate} className="flex-1">
                {t.saveTemplate}
             </LargeButton>
             <LargeButton themeColor={themeColor} variant="success" onClick={onGenerate} className="flex-[2]">
                {t.generate}
             </LargeButton>
         </div>
     </div>
  );
};
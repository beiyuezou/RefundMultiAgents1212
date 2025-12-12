import React from 'react';
import { RefundStep } from '../types';

interface StepWizardProps {
  currentStep: RefundStep;
  language?: 'en' | 'zh' | 'es';
  themeColor?: string;
}

const getLabels = (lang: 'en' | 'zh' | 'es') => {
  switch (lang) {
    case 'zh': return { evidence: "上传证据", analysis: "分析评估", appeal: "生成申诉" };
    case 'es': return { evidence: "Evidencia", analysis: "Análisis", appeal: "Apelación" };
    default: return { evidence: "Evidence", analysis: "Analysis", appeal: "Appeal" };
  }
};

export const StepWizard: React.FC<StepWizardProps> = ({ currentStep, language = 'en', themeColor = 'blue' }) => {
  const labels = getLabels(language);
  const steps = [
    { id: RefundStep.UPLOAD_EVIDENCE, label: labels.evidence },
    { id: RefundStep.PROCESSING, label: labels.analysis },
    { id: RefundStep.FINAL_LETTER, label: labels.appeal },
  ];

  const getStepIndex = (step: RefundStep) => {
    if (step === RefundStep.WELCOME) return -1;
    if (step === RefundStep.UPLOAD_EVIDENCE) return 0;
    if (step === RefundStep.PROCESSING || step === RefundStep.REVIEW_ANALYSIS || step === RefundStep.GENERATING_LETTER) return 1;
    if (step === RefundStep.FINAL_LETTER) return 2;
    return 0;
  };

  const currentIndex = getStepIndex(currentStep);

  if (currentIndex === -1) return null;

  return (
    <div className="w-full mb-10 px-4">
      <div className="flex items-center justify-between relative max-w-2xl mx-auto">
        {/* Background Track */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-3 bg-slate-200 dark:bg-slate-700 shadow-inner-depth rounded-full -z-10"></div>
        
        {/* Progress Fill */}
        <div 
          className={`absolute left-0 top-1/2 transform -translate-y-1/2 h-3 bg-gradient-to-r from-${themeColor}-400 to-${themeColor}-600 shadow-lg rounded-full -z-10 transition-all duration-700 ease-out`}
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        ></div>
        
        {steps.map((step, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center relative group">
              {/* The Bead/Sphere */}
              <div 
                className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full font-bold text-lg md:text-xl transition-all duration-500 z-10 ${
                  isActive 
                    ? `bg-gradient-to-br from-${themeColor}-400 to-${themeColor}-600 text-white shadow-lg scale-110 border-2 border-white dark:border-slate-800` 
                    : 'bg-slate-100 text-slate-400 border-2 border-slate-300 shadow-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-500'
                } ${isCurrent ? `ring-4 ring-${themeColor}-200 ring-opacity-50` : ''}`}
              >
                {/* Shine effect on sphere */}
                {isActive && (
                    <div className="absolute top-1 right-2 w-3 h-3 bg-white opacity-30 rounded-full filter blur-[1px]"></div>
                )}
                {index + 1}
              </div>
              
              {/* Label Bubble */}
              <div className={`mt-3 px-3 py-1 rounded-lg text-sm font-bold transition-all duration-300 ${
                  isActive ? `bg-white dark:bg-slate-800 dark:text-${themeColor}-300 text-${themeColor}-700 shadow-sm transform translate-y-0 opacity-100` : 'text-slate-400 dark:text-slate-600 translate-y-2 opacity-80'
              }`}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export enum RefundStep {
  WELCOME = 'WELCOME',
  UPLOAD_EVIDENCE = 'UPLOAD_EVIDENCE',
  PROCESSING = 'PROCESSING',
  REVIEW_ANALYSIS = 'REVIEW_ANALYSIS',
  GENERATING_LETTER = 'GENERATING_LETTER',
  FINAL_LETTER = 'FINAL_LETTER',
}

export interface ExtractedEvidence {
  merchantName: string;
  merchantEmail?: string; // New field for email actions
  transactionDate: string;
  amount: string;
  currency: string;
  bookingReference?: string;
  issueDescription: string;
  searchSources?: { title: string; uri: string }[];
}

export interface PolicyAnalysis {
  isLikelyRefundable: boolean;
  refundProbabilityScore: number; // 0-100
  keyPolicyClause: string;
  strategySuggestion: string;
}

export interface EvidenceFile {
  id: string;
  file?: File; // Optional if created from blob
  preview: string; // URL for blob or icon
  base64?: string; // Optional (not needed for URLs)
  mimeType: string;
  type: 'image' | 'pdf' | 'audio' | 'video' | 'url';
  name: string;
  uploadStatus?: 'processing' | 'done' | 'error';
  uploadProgress?: number;
}

export interface RefundCase {
  id: string;
  createdAt?: number;
  userLanguage: 'en' | 'zh' | 'es';
  evidenceFiles: EvidenceFile[];
  userNotes: string;
  extractedData?: ExtractedEvidence;
  policyAnalysis?: PolicyAnalysis;
  generatedLetter?: string;
}

export interface RefundTemplate {
  id: string;
  name: string;
  createdAt: number;
  data: {
    merchantName?: string;
    merchantEmail?: string;
    issueDescription?: string;
    userNotes?: string;
    currency?: string;
  }
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export type AgentStatus = 'idle' | 'analyzing_evidence' | 'checking_policy' | 'writing_appeal';

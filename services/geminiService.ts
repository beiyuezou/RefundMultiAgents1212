import { GoogleGenAI, Type, Schema, Chat, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ExtractedEvidence, PolicyAnalysis, EvidenceFile } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Global Safety Guardrails
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

/**
 * Chatbot: Refund Guide
 * Creates a chat session specialized in guiding users through the refund process.
 */
export const createRefundGuideChat = (language: 'en' | 'zh' | 'es' = 'en'): Chat => {
  const langContext = {
    en: "Answer in English.",
    zh: "Please answer in Chinese (Simplified).",
    es: "Please answer in Spanish."
  };

  return ai.chats.create({
    model: "gemini-2.5-flash",
    config: {
      safetySettings: SAFETY_SETTINGS,
      systemInstruction: `You are a friendly and helpful Travel Refund Assistant. 
      Your goal is to guide users through using this "Refund Multi-Agents" app and answer general questions about travel refunds.
      ${langContext[language]}
      
      The App Workflow is:
      1. Upload Evidence (Photos, PDFs, Voice Notes, Videos, Links).
      2. Processing (AI Agents extract data and check policies).
      3. Review (You see the odds of winning).
      4. Generate Appeal Letter (AI writes the legal letter).
      
      Keep answers concise, encouraging, and easy to understand.
      If asked about legal advice, state that you provide general information based on standard policies, not professional legal counsel.`,
    },
  });
};

/**
 * Helper to extract JSON from text that might contain markdown or chatter
 */
const cleanAndParseJSON = (text: string): any => {
  try {
    // 1. Try direct parse
    return JSON.parse(text);
  } catch (e) {
    // 2. Try extracting from markdown code blocks
    const match = text.match(/```json([\s\S]*?)```/);
    if (match && match[1]) {
      try { return JSON.parse(match[1].trim()); } catch (err) { /* continue */ }
    }
    
    // 3. Try finding the first '{' and last '}'
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1) {
      const jsonStr = text.substring(firstOpen, lastClose + 1);
      try { return JSON.parse(jsonStr); } catch (err) { /* continue */ }
    }
    
    throw new Error("Failed to parse JSON response");
  }
};

/**
 * AGENT 1: Evidence Collector
 */
export const extractEvidenceAgent = async (
  files: EvidenceFile[],
  userNotes: string,
  useSearch: boolean = false
): Promise<ExtractedEvidence> => {
  const schemaObj = {
    type: Type.OBJECT,
    properties: {
      merchantName: { type: Type.STRING, description: "Name of airline, hotel, or travel agency" },
      merchantEmail: { type: Type.STRING, description: "Customer service or support email address found in documents (e.g. support@airline.com)" },
      transactionDate: { type: Type.STRING, description: "Date of transaction or booking in YYYY-MM-DD format" },
      amount: { type: Type.STRING, description: "Total amount paid (numeric value)" },
      currency: { type: Type.STRING, description: "Currency code (e.g. USD, CNY)" },
      bookingReference: { type: Type.STRING, description: "Booking ID, PNR, or Ticket Number if visible" },
      issueDescription: { type: Type.STRING, description: "Summary of what went wrong based on visual evidence, audio transcripts, or notes" },
    },
    required: ["merchantName", "amount", "issueDescription"],
  };

  const schema: Schema = schemaObj;

  // Prepare parts for files with content (Images, Audio, PDF, Video)
  const fileParts = files
    .filter(f => f.base64 && f.type !== 'url') 
    .map(f => ({
      inlineData: {
        mimeType: f.mimeType,
        data: f.base64!,
      },
    }));

  const urlEvidence = files
    .filter(f => f.type === 'url')
    .map(f => f.name)
    .join('\n');

  let promptText = `You are an expert Data Extraction Agent. 
          Analyze the provided evidence and the user's notes.
          
          User Notes: "${userNotes}"
          URLs/Links provided: ${urlEvidence || "None"}
          
          Extraction Rules:
          1. **Hierarchy of Truth**: PRIORITIZE official documents (Receipts, Invoices, Tickets) over User Notes for factual data.
          2. **Issue Description**: Summarize *why* the refund is needed.
          3. **Contact Info**: Look carefully for "support@", "help@" emails.
          `;

  const config: any = {
    temperature: 0.1,
    safetySettings: SAFETY_SETTINGS,
  };

  if (useSearch) {
    config.tools = [{ googleSearch: {} }];
    promptText += `
    **CRITICAL INSTRUCTION**: 
    - Use Google Search to verify specific details if unclear.
    - **Output strictly VALID JSON**.
    - No markdown formatting like \`\`\`json.
    - No conversational filler.
    
    Format: {"merchantName": "...", "merchantEmail": "...", "transactionDate": "...", "amount": "...", "currency": "...", "bookingReference": "...", "issueDescription": "..."}
    `;
  } else {
    config.responseMimeType = "application/json";
    config.responseSchema = schema;
    promptText += `\n\nExtract the key details strictly into JSON format.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        ...fileParts,
        { text: promptText },
      ],
    },
    config: config,
  });

  const text = response.text || "";
  
  // Use robust parser
  let data: ExtractedEvidence;
  try {
    data = cleanAndParseJSON(text) as ExtractedEvidence;
  } catch (e) {
    console.error("Agent 1 JSON parse error", text);
    throw new Error("Failed to extract data. Please provide clearer evidence.");
  }

  if (useSearch && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
    const chunks = response.candidates[0].groundingMetadata.groundingChunks;
    const sources = chunks
      .map((chunk: any) => chunk.web)
      .filter((web: any) => web && web.uri && web.title);
      
    if (sources.length > 0) {
      data.searchSources = sources;
    }
  }

  return data;
};

/**
 * AGENT 2: Policy Expert
 */
export const policyAnalysisAgent = async (
  evidence: ExtractedEvidence
): Promise<PolicyAnalysis> => {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      isLikelyRefundable: { type: Type.BOOLEAN },
      refundProbabilityScore: { type: Type.INTEGER, description: "0 to 100 confidence score" },
      keyPolicyClause: { type: Type.STRING, description: "The likely legal or policy reason for the refund" },
      strategySuggestion: { type: Type.STRING, description: "Advice on how to argue this case" },
    },
    required: ["isLikelyRefundable", "keyPolicyClause", "strategySuggestion"],
  };

  const prompt = `
    You are a Senior Travel Policy Analyst.
    Case Details:
    - Merchant: ${evidence.merchantName}
    - Issue: ${evidence.issueDescription}
    - Amount: ${evidence.amount} ${evidence.currency}
    
    Based on general international consumer protection laws and standard travel industry policies:
    1. Assess if this is likely refundable.
    2. Identify the strongest legal or policy argument.
    3. Suggest a negotiation strategy.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview", 
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.3,
      safetySettings: SAFETY_SETTINGS,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Agent 2 failed to analyze policy.");
  return cleanAndParseJSON(text) as PolicyAnalysis;
};

/**
 * AGENT 3: Legal Writer
 */
export const letterGeneratorAgent = async (
  evidence: ExtractedEvidence,
  analysis: PolicyAnalysis,
  language: string
): Promise<string> => {
  const prompt = `
    You are a professional Consumer Rights Lawyer.
    Write a formal, firm, but polite refund appeal letter.
    
    Language: ${language === 'zh' ? 'Chinese (Simplified)' : 'English'}
    
    Facts:
    - To: ${evidence.merchantName}
    - Email: ${evidence.merchantEmail || 'Customer Support'}
    - Reference: ${evidence.bookingReference || 'N/A'}
    - Date: ${evidence.transactionDate}
    - Amount: ${evidence.amount} ${evidence.currency}
    - Incident: ${evidence.issueDescription}
    
    Legal Argument:
    - Core Argument: ${analysis.keyPolicyClause}
    - Strategy: ${analysis.strategySuggestion}
    
    Structure:
    1. Formal header.
    2. Clear statement of request (Full Refund).
    3. Factual timeline.
    4. Legal/Policy justification.
    5. Call to action (7 days deadline).
    
    Output strictly the letter content in Markdown format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      temperature: 0.7,
      safetySettings: SAFETY_SETTINGS,
    },
  });

  return response.text || "Failed to generate letter.";
};
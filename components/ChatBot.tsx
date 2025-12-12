import React, { useState, useRef, useEffect } from 'react';
import { Chat, GenerateContentResponse } from "@google/genai";
import { createRefundGuideChat } from '../services/geminiService';
import { ChatMessage } from '../types';
import { getChatHistoryFromDB, saveChatMessageToDB, clearChatHistoryDB } from '../services/db';

interface ChatBotProps {
  appLanguage: 'en' | 'zh' | 'es';
}

export const ChatBot: React.FC<ChatBotProps> = ({ appLanguage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef(appLanguage);

  useEffect(() => {
    // Re-initialize or update chat when language changes, 
    // but only if we haven't started a session or need to switch context heavily.
    // For simplicity, we just create a new session instance wrapper, 
    // keeping history in DB/UI intact.
    chatSessionRef.current = createRefundGuideChat(appLanguage);
    languageRef.current = appLanguage;
  }, [appLanguage]);

  useEffect(() => {
    // Load history on mount
    const init = async () => {
      chatSessionRef.current = createRefundGuideChat(appLanguage);
      
      try {
        const savedHistory = await getChatHistoryFromDB();
        if (savedHistory && savedHistory.length > 0) {
           setMessages(savedHistory);
        } else {
           const welcomeText = appLanguage === 'zh' 
             ? "你好！我是您的退款助手。有什么可以帮您？" 
             : appLanguage === 'es'
             ? "¡Hola! Soy su asistente de reembolso. ¿Cómo puedo ayudarle?"
             : "Hi! I'm your Refund Assistant. Need help with the process?";

           const welcomeMsg: ChatMessage = { id: 'init', role: 'model', text: welcomeText };
           setMessages([welcomeMsg]);
           await saveChatMessageToDB(welcomeMsg);
        }
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: inputText
    };

    setMessages(prev => [...prev, userMsg]);
    saveChatMessageToDB(userMsg).catch(e => console.error("Failed to save user msg", e));
    
    setInputText('');
    setIsLoading(true);

    try {
      // Create a placeholder for the model response
      const modelMsgId = crypto.randomUUID();
      const modelMsgPlaceholder: ChatMessage = { id: modelMsgId, role: 'model', text: '' };
      setMessages(prev => [...prev, modelMsgPlaceholder]);

      const result = await chatSessionRef.current.sendMessageStream({ message: userMsg.text });
      
      let fullText = '';
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        const text = c.text || '';
        fullText += text;
        
        // Update the last message with accumulating text
        setMessages(prev => prev.map(msg => 
          msg.id === modelMsgId ? { ...msg, text: fullText } : msg
        ));
      }
      
      // Save full response to DB after streaming is done
      await saveChatMessageToDB({ id: modelMsgId, role: 'model', text: fullText });

    } catch (error) {
      console.error("Chat error", error);
      const errorMsg: ChatMessage = { id: crypto.randomUUID(), role: 'model', text: "Sorry, I'm having trouble connecting right now. Please try again." };
      setMessages(prev => [...prev, errorMsg]);
      saveChatMessageToDB(errorMsg).catch(e => console.error(e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
     if(window.confirm("Are you sure you want to clear the chat history?")) {
        try {
            await clearChatHistoryDB();
            const welcomeMsg: ChatMessage = { id: crypto.randomUUID(), role: 'model', text: "History cleared." };
            setMessages([welcomeMsg]);
            await saveChatMessageToDB(welcomeMsg);
            // Reset session
            chatSessionRef.current = createRefundGuideChat(appLanguage);
        } catch (e) {
            console.error("Failed to clear history", e);
        }
     }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 md:w-96 bg-white dark:bg-slate-800 rounded-3xl shadow-3d-card border-2 border-white dark:border-slate-700 overflow-hidden flex flex-col animate-pop-in" style={{ height: '500px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-4 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">AI</div>
              <h3 className="text-white font-bold text-lg">Refund Guide</h3>
            </div>
            <div className="flex gap-2">
                <button 
                  onClick={handleClearHistory}
                  className="text-white/60 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
                  title="Clear Memory"
                >
                  Clear
                </button>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="text-white/80 hover:text-white transition-colors text-xl font-bold ml-2"
                >
                  ✕
                </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900 space-y-4">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] p-3 rounded-2xl text-sm md:text-base leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask a question..."
                className="flex-1 p-3 bg-slate-100 dark:bg-slate-700 rounded-xl border-transparent focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-800 dark:text-white"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !inputText.trim()}
                className="bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full shadow-3d-btn flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-4 border-white dark:border-slate-600 ${
          isOpen ? 'bg-slate-700 rotate-45' : 'bg-gradient-to-br from-blue-500 to-blue-700'
        }`}
      >
        {isOpen ? (
          <span className="text-3xl text-white font-bold">+</span>
        ) : (
          <span className="text-3xl text-white">💬</span>
        )}
      </button>
    </div>
  );
};
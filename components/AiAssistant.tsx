import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, MessageCircle } from 'lucide-react';
import { sendMessageToAssistant, ChatMessage } from '../services/aiService';
import { calculateBalances, getExpensesByCategory } from '../services/storageService';

const AiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Olá! Sou o FinBot, seu assistente financeiro. Como posso te ajudar hoje? 🤖💰' }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input;
    setInput('');
    
    // Add User Message
    const newHistory: ChatMessage[] = [...messages, { role: 'user', text: userText }];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      // Prepare Context (Agora com AWAIT)
      const balances = await calculateBalances();
      const categories = await getExpensesByCategory();
      const topCategory = categories.length > 0 ? `${categories[0].name} (R$ ${categories[0].value})` : 'Nenhuma';

      const context = `
        CONTEXTO ATUAL DO USUÁRIO:
        - Saldo Total: R$ ${balances.realBalance}
        - Receita Mês: R$ ${balances.monthlyIncome}
        - Despesa Mês: R$ ${balances.monthlyExpense}
        - Maior gasto: ${topCategory}
      `;

      const responseText = await sendMessageToAssistant(userText, newHistory, context);
      
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, tive um erro ao processar sua mensagem.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Render (Mantido igual)
  return (
    <>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 md:bottom-10 left-5 md:left-auto md:right-32 bg-gray-900 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-all z-40 group border border-gray-700"
        >
          <Sparkles size={24} className="group-hover:text-brand-400 transition-colors" />
          <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-0 right-0 md:bottom-24 md:right-10 w-full md:w-[400px] h-[80vh] md:h-[600px] bg-white md:rounded-3xl shadow-2xl border border-gray-200 z-50 flex flex-col animate-slide-in-up">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 md:rounded-t-3xl">
             <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-white">
                   <Sparkles size={16} />
                </div>
                <div>
                   <h3 className="font-bold text-gray-900 text-sm">FinBot AI</h3>
                   <p className="text-[10px] text-brand-600 font-medium">Online</p>
                </div>
             </div>
             <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
             </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-brand-600 text-white rounded-tr-none' 
                    : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center space-x-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre suas finanças..."
              className="flex-1 bg-gray-100 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder-gray-400"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="bg-brand-600 text-white p-3 rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AiAssistant;
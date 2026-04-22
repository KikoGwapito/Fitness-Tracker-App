import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Bot, User, Plus } from 'lucide-react';
import { chatWithAICoach } from '../lib/gemini';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  suggested_meal?: {
    foodName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
}

interface AICoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onLogSuggestedMeal: (meal: any) => void;
}

export function AICoachModal({ isOpen, onClose, profile, onLogSuggestedMeal }: AICoachModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      text: "Hi! I'm Coach Gref, your AI fitness coach. Ask me anything about fitness, health, or nutrition. If you need meal ideas, just ask!"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatWithAICoach(userMsg.text, messages, profile);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: result.text,
        suggested_meal: result.suggested_meal
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: "I'm having trouble connecting right now. Please try again later."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "Suggest a high protein breakfast",
    "What should I eat after a workout?",
    "How many calories in a banana?",
    "Give me a low carb dinner idea"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-bg border-t border-white/10 rounded-t-3xl overflow-hidden flex flex-col max-h-[85vh] h-[600px] max-w-2xl mx-auto"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-display uppercase tracking-widest text-sm">Coach Gref</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">AI Fitness & Nutrition</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    msg.role === 'user' ? "bg-white/10" : "bg-accent/20"
                  )}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-white/70" /> : <Bot className="w-4 h-4 text-accent" />}
                  </div>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl p-3",
                    msg.role === 'user' ? "bg-white/10 text-white" : "bg-accent/10 text-white/90 border border-accent/20"
                  )}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    
                    {msg.suggested_meal && (
                      <div className="mt-4 p-3 bg-black/40 rounded-xl border border-white/5">
                        <h4 className="text-xs font-display uppercase tracking-widest text-accent mb-2">Suggested Meal</h4>
                        <p className="text-sm font-medium mb-2">{msg.suggested_meal.foodName}</p>
                        <div className="flex flex-wrap gap-2 text-[10px] font-display uppercase tracking-widest text-white/60 mb-3">
                          <span>{msg.suggested_meal.calories} kcal</span>
                          <span>{msg.suggested_meal.protein}g P</span>
                          <span>{msg.suggested_meal.carbs}g C</span>
                          <span>{msg.suggested_meal.fat}g F</span>
                        </div>
                        <button
                          onClick={() => {
                            onLogSuggestedMeal(msg.suggested_meal);
                            onClose();
                          }}
                          className="w-full py-2 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg text-xs font-display uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-3 h-3" /> Log This Meal
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-accent" />
                  </div>
                  <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-white/10 bg-white/5 flex flex-col gap-3">
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(prompt)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-display uppercase tracking-widest text-white/70 hover:text-white transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about fitness or meal ideas..."
                  className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent/50 transition-colors"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="w-12 h-12 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:hover:bg-accent text-black rounded-xl flex items-center justify-center transition-colors shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

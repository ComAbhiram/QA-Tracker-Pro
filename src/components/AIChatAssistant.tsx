'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CloseButton from './ui/CloseButton';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function AIChatAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hi there! 👋 I am your Team Tracker AI assistant. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user' as const, content: input.trim() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Prepare message history for context, limit to last 10 messages
            const contextMessages = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
            contextMessages.push(userMessage);

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: contextMessages }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();
            const aiMessage = { role: 'assistant' as const, content: data.message.content };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I realized I encountered an error. Please try again later.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            {/* Chat Window */}
            {isOpen && (
                <div className="w-[calc(100vw-48px)] sm:w-[400px] h-[500px] max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">

                    {/* Header */}
                    <div className="bg-yellow-500 p-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-lg">
                                <Bot size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">AI Assistant</h3>
                                <p className="text-[10px] text-yellow-50">Crafted By : Abhiram P Mohan</p>
                            </div>
                        </div>
                        <CloseButton onClick={() => setIsOpen(false)} />
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                </div>

                                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'bg-yellow-500 text-white rounded-tr-none prose-invert'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                                    }`}>
                                    {msg.role === 'user' ? (
                                        <p>{msg.content}</p>
                                    ) : (
                                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:text-slate-800 prose-headings:font-bold prose-headings:text-sm prose-headings:mt-2 prose-headings:mb-1 prose-strong:text-slate-800 prose-strong:font-semibold prose-a:text-yellow-600 prose-a:no-underline hover:prose-a:underline prose-code:text-yellow-600 prose-code:bg-yellow-50 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                    <Bot size={14} />
                                </div>
                                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me anything..."
                                className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-200"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 p-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:hover:bg-yellow-500 transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        <p className="text-[10px] text-center text-slate-400 mt-2">
                            AI can make mistakes. Verify important info.
                        </p>
                    </form>
                </div>
            )}

            {/* Animated Floating Bot Character */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="relative group cursor-pointer select-none transition-all duration-300 active:scale-95 flex flex-col items-center"
                role="button"
                tabIndex={0}
                aria-label="Toggle AI Chat"
            >
                {/* Holographic Tooltip Bubble */}
                <div className="absolute bottom-20 right-2 bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-yellow-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-2xl rounded-br-none shadow-[0_10px_25px_rgba(245,158,11,0.3)] border border-amber-400/30 whitespace-nowrap opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-1.5 z-50">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    <span>Ask AI Assistant!</span>
                </div>

                {/* The Floating Bot Character */}
                <div className="relative w-16 h-16 flex items-center justify-center animate-robot-float">
                    {/* Glowing Aura Ring */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-full blur-xl opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"></div>
                    
                    {/* Bot Body SVG */}
                    <svg viewBox="0 0 100 100" className="w-16 h-16 relative z-10 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)] group-hover:scale-105 transition-transform duration-300">
                        {/* Antennas */}
                        <rect x="47" y="10" width="6" height="15" rx="3" fill="url(#bot-metallic)" />
                        <circle cx="50" cy="8" r="5" fill="#f59e0b" className="animate-pulse" />
                        
                        {/* Ears/Side bolts */}
                        <rect x="15" y="42" width="8" height="16" rx="4" fill="url(#bot-ears)" />
                        <rect x="77" y="42" width="8" height="16" rx="4" fill="url(#bot-ears)" />
                        
                        {/* Head/Body */}
                        <rect x="20" y="25" width="60" height="50" rx="20" fill="url(#bot-head-gradient)" stroke="url(#bot-stroke)" strokeWidth="1.5" />
                        
                        {/* Visor/Screen */}
                        <rect x="28" y="35" width="44" height="26" rx="10" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
                        
                        {/* Eyes - Glowing Led with blinks */}
                        <g className="animate-eye-blink origin-center">
                            {/* Left Eye */}
                            <circle cx="40" cy="48" r="4" fill="#38bdf8" className="group-hover:hidden" />
                            {/* Right Eye */}
                            <circle cx="60" cy="48" r="4" fill="#38bdf8" className="group-hover:hidden" />
                            
                            {/* Left Eye Hover - Happy Arc */}
                            <path d="M 36 50 Q 40 44 44 50" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" className="hidden group-hover:block" />
                            {/* Right Eye Hover - Happy Arc */}
                            <path d="M 56 50 Q 60 44 64 50" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" className="hidden group-hover:block" />
                        </g>

                        {/* Mouth/LED Signal */}
                        <rect x="42" y="55" width="16" height="2" rx="1" fill="#f59e0b" className="animate-pulse" />
                        
                        {/* Cheek Blushes */}
                        <circle cx="33" cy="54" r="2.5" fill="#f43f5e" opacity="0.4" className="hidden group-hover:block" />
                        <circle cx="67" cy="54" r="2.5" fill="#f43f5e" opacity="0.4" className="hidden group-hover:block" />
                        
                        {/* Gradients definitions */}
                        <defs>
                            <linearGradient id="bot-head-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#475569" />
                                <stop offset="100%" stopColor="#1e293b" />
                            </linearGradient>
                            <linearGradient id="bot-stroke" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
                                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
                            </linearGradient>
                            <linearGradient id="bot-metallic" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#94a3b8" />
                                <stop offset="100%" stopColor="#475569" />
                            </linearGradient>
                            <linearGradient id="bot-ears" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#d97706" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                {/* Ambient Shadow beneath character */}
                <div className="w-10 h-1.5 bg-slate-900/10 dark:bg-black/35 rounded-full mx-auto blur-[1.5px] animate-shadow-pulse mt-0.5"></div>
            </div>
        </div>
    );
}

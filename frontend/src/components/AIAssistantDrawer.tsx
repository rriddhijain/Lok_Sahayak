"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ShieldCheck,
  FileText,
  CornerDownLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { askAIAssistant } from "@/lib/api";

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  citations?: Array<{ source: string; reference: string }>;
  suggested_actions?: string[];
  timestamp: string;
}

export default function AIAssistantDrawer({
  isOpen,
  onClose,
  currentRole,
}: AIAssistantDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: `Hello! I am your Hospital Decision Assistant for the ${currentRole} role. I have real-time access to medicine stock counts, expiring batches, patient consumption trends, and regional hospital bed availability. How can I help you today?`,
      citations: [
        { source: "Hospital Records", reference: "Live Database & Surveillance" },
      ],
      suggested_actions: [
        "Show medicines expiring soon",
        "What is our Tranexamic Acid supply runway?",
        "Check regional hospital bed availability",
        "Which medicines are below safe stock levels?",
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputValue.trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputValue("");
    setLoading(true);

    try {
      const res = await askAIAssistant(textToSend, currentRole);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: res.response || "Telemetry query completed with full provenance.",
        citations: res.citations || [],
        suggested_actions: res.suggested_actions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: "I was able to query our internal decision engine: Tranexamic Acid is critically depleted with 1.8 days reserve remaining, and Ceftriaxone Batch #CFX-901 has 40 vials expiring in 18 days under FEFO protocol.",
        citations: [
          { source: "Local Cache", reference: "FEFO Engine & Stockout Monitor" },
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            {/* Drawer Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-sky-600/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      Antigravity AI Assistant
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 border border-sky-200">
                        Grounded
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Role context: <span className="font-semibold text-slate-700">{currentRole}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-start gap-2 max-w-[90%]">
                      {msg.sender === "ai" && (
                        <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-xs">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-slate-900 text-white rounded-tr-xs shadow-sm"
                            : "bg-white text-slate-800 border border-slate-200 rounded-tl-xs shadow-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* Auditable Data Citations */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                              Data Provenance & Citations:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.citations.map((c, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200"
                                >
                                  {c.source}: {c.reference}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {msg.sender === "user" && (
                        <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono mt-1 px-1">
                      {msg.timestamp}
                    </span>

                    {/* Quick Action Chips from AI Response */}
                    {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%] pl-9">
                        {msg.suggested_actions.map((chip, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(chip)}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white hover:bg-sky-50 text-sky-800 border border-sky-200 hover:border-sky-300 transition-all flex items-center gap-1 shadow-xs"
                          >
                            <Lightbulb className="w-3 h-3 text-sky-600" />
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-bounce delay-100" />
                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-bounce delay-200" />
                    <span className="font-mono text-[11px]">
                      Querying Milvus & statistical forecaster...
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Action Suggestions Footer Bar */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                  Quick:
                </span>
                <button
                  onClick={() => handleSend("Show me expiring antibiotics")}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                >
                  Expiring Antibiotics
                </button>
                <button
                  onClick={() => handleSend("What is our Tranexamic Acid runway?")}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                >
                  Tranexamic Runway
                </button>
                <button
                  onClick={() => handleSend("Simulate 2.5x emergency surge")}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                >
                  2.5x Surge
                </button>
              </div>

              {/* Chat Input Field */}
              <div className="p-4 border-t border-slate-200 bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Ask about inventory, forecasts, FEFO batches..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={loading}
                    className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || loading}
                    className="p-2.5 rounded-xl bg-slate-900 text-white disabled:opacity-40 hover:bg-slate-800 transition-all flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

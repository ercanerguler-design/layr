"use client";

import { useState, useRef, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { X, Send, Volume2, VolumeX, Loader2 } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  title?: string;
  greeting?: string;
  avatarEmoji: string;
  avatarColor: string;
  type: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentChatProps {
  locationId: string;
  agent: Agent;
  onClose: () => void;
}

export function AgentChat({
  locationId,
  agent,
  onClose,
}: AgentChatProps): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        agent.greeting ??
        `Merhaba! Ben ${agent.name}. ${agent.title ? `${agent.title}.` : ""} Size nasıl yardımcı olabilirim?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // İlk karşılamayı sesli oku
  useEffect(() => {
    if (voiceEnabled && agent.greeting) {
      speakText(agent.greeting);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakText = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    // Türkçe ses var mı bak, yoksa varsayılanı kullan
    const voices = window.speechSynthesis.getVoices();
    const trVoice = voices.find((v) => v.lang.startsWith("tr"));
    if (trVoice) utterance.voice = trVoice;

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await apiClient.post("/api/agents/chat", {
        locationId,
        message: text,
        history: messages.slice(-10),
      });

      const assistantMsg: Message = {
        role: "assistant",
        content: res.data.data.content,
      };
      setMessages([...newMessages, assistantMsg]);

      if (voiceEnabled) {
        speakText(assistantMsg.content);
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Şu an konuşamıyorum, lütfen tekrar dene.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "rgba(8,8,15,0.95)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-5 py-4 border-b border-white/10"
        style={{
          background: `linear-gradient(135deg, ${agent.avatarColor}22, transparent)`,
        }}
      >
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border-2 flex-shrink-0 relative"
          style={{
            backgroundColor: agent.avatarColor + "22",
            borderColor: agent.avatarColor,
          }}
        >
          {agent.avatarEmoji}
          {speaking && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <h2 className="font-black text-lg leading-tight">{agent.name}</h2>
          {agent.title && <p className="text-xs opacity-60">{agent.title}</p>}
        </div>

        {/* Ses toggle */}
        <button
          onClick={() => {
            if (voiceEnabled) stopSpeaking();
            setVoiceEnabled(!voiceEnabled);
          }}
          className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center"
          title={voiceEnabled ? "Sesi kapat" : "Sesi aç"}
        >
          {voiceEnabled ? (
            <Volume2 size={16} className="text-white/70" />
          ) : (
            <VolumeX size={16} className="text-white/30" />
          )}
        </button>

        <button
          onClick={() => {
            stopSpeaking();
            onClose();
          }}
          className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center"
        >
          <X size={18} className="text-white/70" />
        </button>
      </div>

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-1"
                style={{
                  backgroundColor: agent.avatarColor + "22",
                  border: `1.5px solid ${agent.avatarColor}`,
                }}
              >
                {agent.avatarEmoji}
              </div>
            )}

            <div
              className="max-w-xs md:max-w-md rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={
                msg.role === "assistant"
                  ? {
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.9)",
                    }
                  : { backgroundColor: agent.avatarColor, color: "white" }
              }
            >
              {msg.content}
            </div>

            {msg.role === "user" && (
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sm flex-shrink-0 mt-1">
                👤
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: agent.avatarColor + "22" }}
            >
              {agent.avatarEmoji}
            </div>
            <div className="bg-white/6 border border-white/8 rounded-2xl px-4 py-3 flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full bg-white/40 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-white/40 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-white/40 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Önerilen sorular */}
      <div className="px-5 py-2 flex gap-2 overflow-x-auto">
        {[
          agent.type === "HISTORICAL"
            ? "Bana kendinizi anlatır mısınız?"
            : "Ne önerirsiniz?",
          agent.type === "HISTORICAL"
            ? "En önemli anınız neydi?"
            : "Bana yardım edin",
          "Bu yer hakkında ne düşünüyorsunuz?",
        ].map((q) => (
          <button
            key={q}
            onClick={() => {
              setInput(q);
              inputRef.current?.focus();
            }}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/50 hover:bg-white/5 hover:text-white/70 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-white/10 flex gap-3">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder={`${agent.name}'a bir şey sor...`}
          className="flex-1 bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm outline-none focus:border-white/20"
          disabled={loading}
          autoFocus
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="w-12 h-12 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all"
          style={{ backgroundColor: agent.avatarColor }}
        >
          {loading ? (
            <Loader2 size={18} className="text-white animate-spin" />
          ) : (
            <Send size={18} className="text-white" />
          )}
        </button>
      </div>
    </div>
  );
}

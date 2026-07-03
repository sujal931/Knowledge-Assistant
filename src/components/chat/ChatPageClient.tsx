"use client";

import { useChat } from "ai/react";
import { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  FileText,
  MessageSquare,
  Search,
  StopCircle,
  Paperclip,
  ArrowDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatPageClientProps {
  organizationId: string;
  userId: string;
  conversationId?: string;
  initialMessages?: Array<{ id: string; role: "user" | "assistant"; content: string }>;
}

interface SourceInfo {
  documentId: string;
  documentTitle: string;
  chunkContent: string;
  score: number;
}

export default function ChatPageClient({
  organizationId,
  userId,
  conversationId: initialConversationId,
  initialMessages = [],
}: ChatPageClientProps) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const [queryType, setQueryType] = useState<string>("");
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [expandedSource, setExpandedSource] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, setInput } =
    useChat({
      api: "/api/chat",
      body: {
        organizationId,
        userId,
        conversationId,
      },
      initialMessages: initialMessages as Array<{ id: string; role: "user" | "assistant"; content: string }>,
      onResponse(response) {
        // Extract metadata from headers
        const convId = response.headers.get("X-Conversation-Id");
        if (convId) setConversationId(convId);

        const qt = response.headers.get("X-Query-Type");
        if (qt) setQueryType(qt);

        const conf = response.headers.get("X-Confidence");
        if (conf) setConfidence(parseFloat(conf));

        const srcs = response.headers.get("X-Sources");
        if (srcs) {
          try {
            setSources(JSON.parse(srcs));
          } catch { /* ignore */ }
        }
      },
      onFinish() {
        // Could fetch follow-up questions here
      },
    });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detect scroll position
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollBtn(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const suggestedPrompts = [
    { icon: Search, text: "What are the key findings in our latest report?", color: "text-blue-400" },
    { icon: FileText, text: "Summarize the onboarding documentation", color: "text-green-400" },
    { icon: MessageSquare, text: "What were the decisions from last week's meeting?", color: "text-purple-400" },
    { icon: Sparkles, text: "Help me understand our company policies", color: "text-amber-400" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 md:px-0"
      >
        <div className="max-w-3xl mx-auto">
          {/* Empty State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-float">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Knowledge Assistant
              </h2>
              <p className="text-sm text-white/40 mb-8 text-center max-w-md">
                Ask questions about your organization&apos;s documents. I&apos;ll search the knowledge base and provide accurate, cited answers.
              </p>

              {/* Suggested Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(prompt.text);
                    }}
                    className="flex items-start gap-3 p-4 text-left bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 rounded-2xl transition-all duration-200 group cursor-pointer"
                  >
                    <prompt.icon className={`w-5 h-5 ${prompt.color} flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform`} />
                    <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors leading-relaxed">
                      {prompt.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`mb-6 animate-fade-in ${
                message.role === "user" ? "flex justify-end" : ""
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {message.role === "user" ? (
                // User Message
                <div className="max-w-[85%] px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-white">
                  <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              ) : (
                // Assistant Message
                <div className="max-w-full px-5 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-white">
                  {/* Agent Action Badge */}
                  {queryType && index === messages.length - 1 && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {queryType === "rag" && <><Search className="w-3 h-3" /> Knowledge Search</>}
                        {queryType === "summarize" && <><FileText className="w-3 h-3" /> Summarizing</>}
                        {queryType === "chat_search" && <><MessageSquare className="w-3 h-3" /> Chat Search</>}
                        {queryType === "direct" && <><Sparkles className="w-3 h-3" /> Direct Answer</>}
                      </span>
                      {confidence > 0 && (
                        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                          confidence >= 0.7
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : confidence >= 0.4
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {Math.round(confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="markdown-content text-sm text-white/85 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {/* Sources */}
                  {index === messages.length - 1 && sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-2">
                        Sources ({sources.length})
                      </p>
                      <div className="space-y-2">
                        {sources.map((source, si) => (
                          <div
                            key={si}
                            className="p-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 rounded-xl transition-all duration-200 cursor-pointer"
                            onClick={() => setExpandedSource(expandedSource === si ? null : si)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-xs font-medium text-white/70">
                                  {source.documentTitle}
                                </span>
                              </div>
                              <span className="text-[10px] text-white/30">
                                {Math.round(source.score * 100)}% match
                              </span>
                            </div>
                            {expandedSource === si && (
                              <p className="mt-2 text-[11px] text-white/40 leading-relaxed animate-fade-in">
                                {source.chunkContent}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Questions */}
                  {index === messages.length - 1 && followUpQuestions.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/5">
                      <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-2">
                        Follow-up questions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {followUpQuestions.map((q, qi) => (
                          <button
                            key={qi}
                            onClick={() => setInput(q)}
                            className="text-[11px] px-3 py-1.5 rounded-full bg-indigo-500/8 text-indigo-300/70 border border-indigo-500/10 hover:bg-indigo-500/15 hover:text-indigo-300 transition-all"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="max-w-full px-5 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-white animate-fade-in">
              <div className="flex gap-1.5 items-center py-2 px-1">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to Bottom */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 p-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors animate-fade-in"
        >
          <ArrowDown className="w-4 h-4 text-white/50" />
        </button>
      )}

      {/* Input Area */}
      <div className="border-t border-white/5 p-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end p-2 bg-[#0d0d18] border border-white/5 rounded-2xl">
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }}
                placeholder="Ask about your knowledge base..."
                rows={1}
                className="flex-1 bg-transparent border-none text-sm text-white/90 placeholder:text-white/20 focus:outline-none resize-none px-3 py-2.5 max-h-32 leading-relaxed"
                style={{ minHeight: "40px" }}
              />
              <div className="flex items-center gap-1 px-1">
                {isLoading ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="p-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    <StopCircle className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className={`p-2.5 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed ${
                      input.trim()
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                        : "bg-transparent text-white/30"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </form>
          <p className="text-[10px] text-white/15 text-center mt-2">
            AI can make mistakes. Always verify important information from citations.
          </p>
        </div>
      </div>
    </div>
  );
}

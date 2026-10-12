"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Loader2,
  Bot,
  User,
  FileText,
  ExternalLink,
  Copy,
  CheckCheck,
  MessageSquare,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useEKAStore } from "@/store/eka-store";
import { apiClient } from "@/lib/api-client";
import type { ChatMessage } from "@/store/eka-store";
import { formatDistanceToNow } from "date-fns";

const SUGGESTED_QUERIES = [
  "What is the per-diem meal allowance for international travel?",
  "Do receipts need to be submitted for expenses under $25?",
  "What is the hotel rate cap for New York City?",
  "Can I book business class for flights over 6 hours?",
  "What is the policy on same-day reimbursement requests?",
];

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 items-center px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-primary/60"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function CitationCard({
  citation,
  index,
}: {
  citation: { claim_text?: string; confidence_score?: number };
  index: number;
}) {
  return (
    <div className="citation-card mt-2">
      <div className="flex items-center gap-1.5 mb-1">
        <FileText className="w-3 h-3 text-primary" />
        <span className="text-primary font-medium">Source {index + 1}</span>
        {citation.confidence_score !== undefined && (
          <span className="ml-auto text-muted-foreground">
            {(citation.confidence_score * 100).toFixed(0)}% confidence
          </span>
        )}
      </div>
      {citation.claim_text && (
        <p className="text-muted-foreground leading-snug">{citation.claim_text}</p>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`chat-message flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
          isUser
            ? "bg-primary/20 border border-primary/30"
            : "bg-secondary border border-border"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary" />
        ) : (
          <Bot className="w-4 h-4 text-blue-400" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`group relative rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "chat-message-user self-end"
              : "chat-message-assistant self-start w-full"
          }`}
        >
          {message.isStreaming ? (
            <span className="typing-cursor">{message.content}</span>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5"
            >
              {message.content}
            </ReactMarkdown>
          )}

          {/* Copy button */}
          {!isUser && !message.isStreaming && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded glass hover:bg-secondary"
            >
              {copied ? (
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>

        {/* Citations */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="w-full space-y-1.5 px-1">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Sources
            </div>
            {message.sources.slice(0, 3).map((source, i) => (
              <div key={i} className="citation-card flex items-start gap-2">
                <FileText className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{source.title || `Source ${i + 1}`}</div>
                  {source.snippet && (
                    <div className="text-muted-foreground line-clamp-2 mt-0.5">{source.snippet}</div>
                  )}
                </div>
                {source.uri && (
                  <a
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground px-1">
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </span>
      </div>
    </motion.div>
  );
}

export function ChatPanel() {
  const {
    messages,
    addMessage,
    appendToLastMessage,
    updateLastMessageCitations,
    setStreamingChat,
    isStreamingChat,
    sessionId,
    setSessionId,
    clearMessages,
  } = useEKAStore();

  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formId = useId();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize session on mount
  useEffect(() => {
    if (!sessionId) {
      apiClient.createSession().then((r) => setSessionId(r.session_id)).catch(console.error);
    }
  }, [sessionId, setSessionId]);

  const handleSubmit = useCallback(
    async (messageText?: string) => {
      const text = messageText || input.trim();
      if (!text || isStreamingChat) return;

      setInput("");
      setError(null);
      setStreamingChat(true);

      // Add user message
      addMessage({
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date(),
      });

      // Add placeholder assistant message for streaming
      const assistantId = `assistant-${Date.now()}`;
      addMessage({
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      });

      try {
        for await (const event of apiClient.streamChat(text, sessionId ?? undefined)) {
          if (event.type === "token" && event.content) {
            appendToLastMessage(event.content);
          } else if (event.type === "citations") {
            updateLastMessageCitations(event);
          } else if (event.type === "done" || event.type === "stream_end") {
            break;
          } else if (event.type === "error") {
            setError(event.message || "An error occurred");
            break;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect to the AI assistant");
        // Update last message to show error
        updateLastMessageCitations({ type: "citations", citations: [], sources: [] });
      } finally {
        setStreamingChat(false);
      }
    },
    [input, isStreamingChat, sessionId, addMessage, appendToLastMessage, updateLastMessageCitations, setStreamingChat]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Policy Assistant</h2>
          <span className="text-xs text-muted-foreground">Vertex AI Search · RAG</span>
        </div>
        <div className="flex items-center gap-2">
          {sessionId && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {sessionId.slice(0, 8)}
            </span>
          )}
          <button
            onClick={clearMessages}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title="Clear conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-foreground mb-1">Ask about any policy</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Query your corporate travel and expense policies with grounded, cited answers.
              </p>
            </div>
            <div className="w-full space-y-2">
              <p className="text-xs text-muted-foreground text-center font-medium">Suggested queries</p>
              {SUGGESTED_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(q)}
                  className="w-full text-left text-sm glass hover:bg-secondary rounded-xl px-3 py-2.5 text-muted-foreground hover:text-foreground transition-all duration-150 border border-transparent hover:border-border"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-xl px-4 py-3 border border-red-500/30 text-red-400 text-sm"
          >
            ⚠ {error}
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-border/50">
        <form
          id={formId}
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          className="flex items-end gap-2 glass rounded-2xl px-4 py-3 border border-border/50 focus-within:border-primary/40 transition-colors"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about travel or expense policies..."
            className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground min-h-[24px] max-h-[160px] leading-6"
            rows={1}
            disabled={isStreamingChat}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreamingChat}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isStreamingChat ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
            ) : (
              <Send className="w-4 h-4 text-primary-foreground" />
            )}
          </button>
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Answers grounded in corporate policy corpus · Citations included
        </p>
      </div>
    </div>
  );
}

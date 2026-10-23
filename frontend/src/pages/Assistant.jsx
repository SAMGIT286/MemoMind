import { Mic, Send, Sparkles, Volume2, Trash2, AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import RoleBadge from "../components/common/RoleBadge";

export default function Assistant() {
  const { chat = [], sendMessage, clearChat, isSending, apiUrl } = useApp();
  const { user, role, isReadOnly, language, t } = useAuth();
  const [message, setMessage] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const bottomRef = useRef(null);

  const activeRole = role || user?.role || "elderly";
  const suggestions = (t?.suggestionsByRole && t.suggestionsByRole[activeRole]) || [];

  useEffect(() => {
    try {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      // Fallback
    }
  }, [chat, isSending]);

  const submit = (e) => {
    e?.preventDefault();
    if (!isSending && message.trim()) {
      sendMessage(message);
      setMessage("");
    }
  };

  const startListening = () => {
    setVoiceError("");
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError(t?.voiceNotSupported || "Voice speech recognition is not supported in this browser.");
      setTimeout(() => setVoiceError(""), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === "Hindi" ? "hi-IN" : language === "Marathi" ? "mr-IN" : "en-IN";
      recognition.interimResults = false;
      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);
      recognition.onerror = (err) => {
        setListening(false);
        setVoiceError(`Voice input error: ${err.error || "Permission denied or unavailable"}`);
        setTimeout(() => setVoiceError(""), 4000);
      };
      recognition.onresult = (e) => {
        const transcript = e.results?.[0]?.[0]?.transcript || "";
        if (transcript) {
          setMessage(transcript);
        }
      };
      recognition.start();
    } catch (err) {
      setListening(false);
      setVoiceError("Could not start microphone.");
    }
  };

  const speak = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.lang = language === "Hindi" ? "hi-IN" : language === "Marathi" ? "mr-IN" : "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const safeChat = Array.isArray(chat) ? chat : [];

  return (
    <div className="assistant-page">
      <div className="page-heading-row">
        <div className="page-heading">
          <div className="eyebrow">{t?.assistantTitle || "AI MEMORY ASSISTANT"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
            <h1 style={{ margin: 0 }}>{t?.navAssistant || "AI Assistant"}</h1>
            <RoleBadge role={activeRole} />
          </div>
          <p>{t?.assistantSub || "Ask anything about your medications, doctor appointments, or daily memories."}</p>
        </div>
      </div>

      {voiceError && (
        <div className="error-note" style={{ marginBottom: "15px" }}>
          <AlertCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
          {voiceError}
        </div>
      )}

      <div className="assistant-layout">
        <div className="chat-panel">
          <div className="chat-header">
            <div className="assistant-avatar">
              <Sparkles size={19} />
            </div>
            <div>
              <strong>MemoMind Assistant</strong>
              <span>
                {isSending
                  ? (t?.assistantThinking || "Thinking & analyzing records…")
                  : `${t?.fastApiConnected || "FastAPI Connected"} (${apiUrl})`}
              </span>
            </div>
            <span className="online-dot" title="Service active" />
          </div>

          <div className="chat-messages">
            {safeChat.length === 0 && (
              <div className="empty-state">
                <Sparkles size={28} style={{ color: "var(--green-700)", margin: "0 auto 8px" }} />
                <p>
                  {t?.assistantSub || "Start a conversation with MemoMind. Try asking a question below."}
                </p>
              </div>
            )}

            {safeChat.map((m) => (
              <div
                className={`message-row ${m.role === "user" ? "user" : "assistant"} ${m.isError ? "error-bubble" : ""}`}
                key={m.id || Math.random()}
              >
                <div className="message-avatar">
                  {m.role === "assistant" ? "✦" : (user?.name?.[0] || "ME").toUpperCase()}
                </div>
                <div className="message-content">
                  <div className="message-bubble">
                    {m.text}
                  </div>
                  <span className="message-time">{m.time || "Just now"}</span>
                  {m.role === "assistant" && (
                    <button
                      type="button"
                      className="message-speak"
                      onClick={() => speak(m.text)}
                      title={t?.readAloud || "Read aloud"}
                    >
                      <Volume2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="message-row assistant">
                <div className="message-avatar">✦</div>
                <div className="message-content">
                  <div className="message-bubble typing">
                    {t?.assistantThinking || "Assistant is thinking…"}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <form className="chat-input" onSubmit={submit}>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t?.typeQuestionPlaceholder || "Type your question or memory..."}
              disabled={isSending}
            />
            <button
              type="button"
              className={`voice-input ${listening ? "listening" : ""}`}
              onClick={startListening}
              title={listening ? (t?.listeningNow || "Listening... speak now") : "Voice input"}
            >
              <Mic size={18} />
            </button>
            <button
              type="submit"
              className="send-btn"
              disabled={isSending || !message.trim()}
              title="Send message"
            >
              <Send size={17} />
            </button>
          </form>
        </div>

        <aside className="assistant-side">
          <div className="side-section">
            <div className="side-title-row">
              <h3>{t?.suggestedQuestions || "Suggested Questions"}</h3>
              {safeChat.length > 0 && !isReadOnly && (
                <button type="button" className="text-btn" onClick={clearChat}>
                  <Trash2 size={13} /> {t?.clearChat || "Clear"}
                </button>
              )}
            </div>
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                className="suggestion"
                onClick={() => sendMessage(q)}
                disabled={isSending}
              >
                <span>{q}</span>
                <span>→</span>
              </button>
            ))}
          </div>

          <div className="voice-card">
            <div className="voice-icon">
              <Volume2 size={20} />
            </div>
            <strong>{t?.prefVoiceAssistantTitle || "Voice Assistant"}</strong>
            <p>
              {t?.prefVoiceAssistantDesc || "Speak naturally using your microphone. MemoMind converts your speech to text and can read answers aloud."}
            </p>
            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={startListening}
            >
              <Mic size={16} /> {listening ? (t?.listeningNow || "Listening…") : (t?.prefVoiceAssistantTitle || "Start Speaking")}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

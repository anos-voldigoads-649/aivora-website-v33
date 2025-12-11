/* src/pages/Chat.jsx — Chatbot V4 (Fully Working + Netlify Fixed) */

import React, { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth, db, storage } from "../services/AuthContext";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

/* NETLIFY FUNCTION ENDPOINT */
const AI_ENDPOINT = `${window.location.origin}/.netlify/functions/chat`;

export default function ChatV4() {
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedPersona, setSelectedPersona] = useState("helpful");

  const chatEndRef = useRef(null);

  // Personas
  const personas = {
    helpful: {
      label: "Helpful Assistant",
      promptPrefix: "You are helpful and concise.",
    },
    mentor: {
      label: "Career Mentor",
      promptPrefix:
        "You are a supportive career mentor. Focus on skills, roadmap, and practical steps.",
    },
    counselor: {
      label: "Emotional Support",
      promptPrefix:
        "You are empathetic and calm. Provide emotional support and safety suggestions.",
    },
    technical: {
      label: "Technical Expert",
      promptPrefix:
        "You are a technical expert. Provide clean code, explanations, and debugging steps.",
    },
  };

  /* Load chat history */
  useEffect(() => {
    if (!user) return;
    loadHistory();
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadHistory() {
    try {
      const chatsCol = collection(db, "users", user.uid, "chats");
      const q = query(chatsCol, orderBy("createdAt", "asc"));
      const snap = await getDocs(q);
      const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(loaded);
    } catch (err) {
      console.error("loadHistory", err);
    }
  }

  async function saveMessageToFirestore(msg) {
    if (!user) return;
    try {
      const chatsCol = collection(db, "users", user.uid, "chats");
      const docRef = await addDoc(chatsCol, {
        ...msg,
        createdAt: serverTimestamp(),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.tempId === msg.tempId ? { ...m, id: docRef.id } : m
        )
      );
    } catch (err) {
      console.error("saveMessageToFirestore", err);
    }
  }

  /* File Upload */
  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file || !user) return;

    const path = `user_uploads/${user.uid}/${Date.now()}_${file.name}`;
    const sRef = storageRef(storage, path);
    const uploadTask = uploadBytesResumable(sRef, file);

    uploadTask.on(
      "state_changed",
      (snap) => {
        const pct = Math.round(
          (snap.bytesTransferred / snap.totalBytes) * 100
        );
        setUploadProgress(pct);
      },
      (err) => console.error("Upload error", err),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setUploadProgress(0);
        sendMessage(url, { isFile: true, fileName: file.name });
      }
    );
  }

  /* Text-to-speech */
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }

  /* Voice Input */
  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition not supported.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = false;

    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + text : text));
    };

    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      console.error("Speech error", e);
      setListening(false);
    };

    setListening(true);
    rec.start();
  }

  /* Build Prompt */
  function buildPrompt(userText) {
    const prefix = personas[selectedPersona].promptPrefix;
    return `${prefix}\nUser: ${userText}\nAssistant:`;
  }

  /* MAIN SEND MESSAGE FUNCTION */
  async function sendMessage(rawText, opts = {}) {
    if ((!rawText || !rawText.trim()) && !opts.isFile) return;

    const tempId = "t_" + Date.now();

    const outgoing = {
      tempId,
      sender: "user",
      text: opts.isFile
        ? `Uploaded file: ${opts.fileName || rawText}`
        : rawText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, outgoing]);
    saveMessageToFirestore(outgoing);

    setLoading(true);

    const prompt = opts.isFile
      ? `User uploaded file: ${rawText}`
      : buildPrompt(rawText);

    try {
      const resp = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, userId: user?.uid }),
      });

      if (!resp.ok) {
        throw new Error(`Function error ${resp.status}`);
      }

      const json = await resp.json();

      const aiText =
        json?.response?.trim() ||
        json?.reply?.trim() ||
        "⚠️ No valid response received from AI.";

      const botMsg = {
        sender: "bot",
        text: aiText,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);
      saveMessageToFirestore(botMsg);

      speak(aiText);
    } catch (err) {
      console.error("AI call failed", err);

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text:
            "❌ Network error or server error.\nCheck Netlify function logs and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /* Reaction + Copy + Delete */
  function toggleReaction(id, reaction) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id !== id
          ? m
          : {
              ...m,
              reactions: {
                ...(m.reactions || {}),
                [reaction]: (m.reactions?.[reaction] || 0) + 1,
              },
            }
      )
    );
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text);
    alert("Copied!");
  }

  function deleteMessage(id) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  /* Render message bubble */
  function renderMessage(m) {
    return (
      <div
        key={m.id || m.tempId}
        style={m.sender === "user" ? styles.userRow : styles.botRow}
      >
        {m.sender !== "user" && (
          <img src="/bot-avatar.png" style={styles.avatar} />
        )}

        <div
          style={{
            ...styles.msgBubble,
            background: m.sender === "user" ? "#2563eb" : "#ececec",
            color: m.sender === "user" ? "#fff" : "#111",
          }}
        >
          <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>

          {m.fileUrl && (
            <div style={{ marginTop: 8 }}>
              <a href={m.fileUrl} target="_blank">
                Open file
              </a>
            </div>
          )}

          <div style={styles.msgMeta}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => copyText(m.text)} style={styles.iconBtn}>
                Copy
              </button>
              <button
                onClick={() => toggleReaction(m.id, "👍")}
                style={styles.iconBtn}
              >
                👍
              </button>
              <button
                onClick={() => toggleReaction(m.id, "❤️")}
                style={styles.iconBtn}
              >
                ❤️
              </button>
              <button
                onClick={() => deleteMessage(m.id)}
                style={styles.iconBtn}
              >
                Delete
              </button>
            </div>

            <div style={{ fontSize: 12, color: "#666" }}>
              {m.createdAt
                ? new Date(m.createdAt).toLocaleString()
                : "Sending..."}
            </div>
          </div>
        </div>

        {m.sender === "user" && (
          <img src="/user-avatar.png" style={styles.avatar} />
        )}
      </div>
    );
  }

  /* UI */
  return (
    <div style={darkMode ? styles.pageDark : styles.page}>
      <Navbar />

      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={{ margin: 0 }}>Aivora — Smart Assistant</h2>
            <div style={{ color: "#666" }}>
              Real AI responses, voice, uploads & history
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              style={styles.select}
            >
              {Object.entries(personas).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>

            <label style={{ display: "flex", gap: 8 }}>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              Dark
            </label>
          </div>
        </div>

        <div style={styles.panel}>
          {/* Chat Area */}
          <div style={styles.chatColumn}>
            <div style={styles.messagesWrap}>
              {messages.map(renderMessage)}
              {loading && (
                <div style={{ color: "#666" }}>Aivora is thinking...</div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={styles.controlsRow}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Aivora anything..."
                onKeyDown={(e) =>
                  e.key === "Enter" && sendMessage(input)
                }
                style={styles.input}
              />

              <button
                onClick={() => sendMessage(input)}
                disabled={loading}
                style={styles.sendButton}
              >
                Send
              </button>

              <button onClick={startListening} style={styles.voiceButton}>
                {listening ? "Listening..." : "🎤"}
              </button>

              <label style={styles.uploadLabel}>
                ⬆️
                <input
                  type="file"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {uploadProgress > 0 && (
              <div style={{ marginTop: 8 }}>Uploading: {uploadProgress}%</div>
            )}
          </div>

          {/* Sidebar */}
          <div style={styles.sideColumn}>
            <div style={styles.card}>
              <h4>Quick tips</h4>
              <ul>
                <li>Ask step-by-step queries</li>
                <li>Upload files to analyze</li>
                <li>Switch persona for different behavior</li>
              </ul>
            </div>

            <div style={styles.card}>
              <h4>Recent topics</h4>
              <button
                style={styles.chip}
                onClick={() =>
                  sendMessage("Give me a 7-day learning plan for web dev")
                }
              >
                Web dev plan
              </button>
              <button
                style={styles.chip}
                onClick={() =>
                  sendMessage("How can I prepare for interviews?")
                }
              >
                Interview prep
              </button>
              <button
                style={styles.chip}
                onClick={() =>
                  sendMessage(
                    "Suggest safety steps if I feel unsafe."
                  )
                }
              >
                Safety tips
              </button>
            </div>

            <div style={styles.card}>
              <h4>Chat History</h4>
              <div style={{ maxHeight: 150, overflow: "auto" }}>
                {messages
                  .slice(-6)
                  .reverse()
                  .map((m, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <small style={{ color: "#444" }}>
                        {m.sender === "user" ? "You: " : "Aivora: "}
                      </small>
                      {m.text.slice(0, 60)}
                      {m.text.length > 60 ? "..." : ""}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* STYLES */
const common = {
  containerWidth: 1100,
};

const styles = {
  page: { minHeight: "100vh", background: "#f5f7fb" },
  pageDark: { minHeight: "100vh", background: "#0b1020", color: "#fff" },

  container: { maxWidth: common.containerWidth, margin: "20px auto", padding: 16 },
  headerRow: { display: "flex", justifyContent: "space-between", marginBottom: 12 },
  panel: { display: "flex", gap: 16 },

  chatColumn: { flex: 2, display: "flex", flexDirection: "column", gap: 10 },
  messagesWrap: {
    padding: 12,
    minHeight: 420,
    overflowY: "auto",
    borderRadius: 10,
  },

  botRow: { display: "flex", gap: 10, marginBottom: 12 },
  userRow: { display: "flex", gap: 10, marginBottom: 12, justifyContent: "flex-end" },

  avatar: { width: 36, height: 36, borderRadius: 50 },

  msgBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: "78%",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  },

  msgMeta: { display: "flex", justifyContent: "space-between", marginTop: 8 },
  iconBtn: { background: "transparent", border: "none", cursor: "pointer" },

  controlsRow: { display: "flex", gap: 8, alignItems: "center", marginTop: 8 },
  input: { flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ddd" },

  sendButton: {
    padding: "10px 14px",
    background: "#0b84ff",
    color: "#fff",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
  },

  voiceButton: {
    padding: "8px 10px",
    border: "1px solid #ddd",
    borderRadius: 8,
    cursor: "pointer",
  },
  uploadLabel: {
    padding: "8px 10px",
    border: "1px solid #ddd",
    borderRadius: 8,
    cursor: "pointer",
  },

  sideColumn: { width: 320, display: "flex", flexDirection: "column", gap: 12 },
  card: {
    padding: 12,
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 3px 8px rgba(0,0,0,0.06)",
  },

  select: { padding: 8, borderRadius: 8 },
  chip: {
    padding: "8px 10px",
    borderRadius: 8,
    background: "#f6f7fb",
    border: "1px solid #ddd",
    cursor: "pointer",
    marginBottom: 8,
  },
};

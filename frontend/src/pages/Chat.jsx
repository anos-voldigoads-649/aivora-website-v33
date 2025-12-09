/* src/pages/Chat.jsx — Chatbot V4 (paste entire file) */

import React, { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth, auth, db, storage } from "../services/AuthContext"; // adjust path if needed
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

/*
  CONFIG:
  - Replace AI_ENDPOINT with your backend endpoint or OpenAI proxy (serverless function)
  - If you use OpenAI directly from client (NOT recommended), you must secure keys via backend.
*/
const AI_ENDPOINT = "/.netlify/functions/chat"



export default function ChatV4() {
  const { user } = useAuth(); // user from AuthContext
  const [messages, setMessages] = useState([]); // {id, sender, text, createdAt, reactions:[], fileUrl}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedPersona, setSelectedPersona] = useState("helpful");
  const chatEndRef = useRef(null);

  // Personas: modifies prompt behaviour
  const personas = {
    helpful: { label: "Helpful Assistant", promptPrefix: "You are helpful and concise." },
    mentor: { label: "Career Mentor", promptPrefix: "You are a supportive career mentor. Focus on skills, roadmap and practical steps." },
    counselor: { label: "Emotional Support", promptPrefix: "You are empathetic and calm. Provide emotional support and safety suggestions when needed." },
    technical: { label: "Technical Expert", promptPrefix: "You are a technical expert. Provide code, explanations and step-by-step debugging." },
  };

  // bootstrap: load chat history
  useEffect(() => {
    if (!user) return;
    loadHistory();
  }, [user]);

  // scroll on new message
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
    // Save under users/{uid}/chats
    try {
      const chatsCol = collection(db, "users", user.uid, "chats");
      const docRef = await addDoc(chatsCol, {
        ...msg,
        createdAt: serverTimestamp(),
      });
      // update local with id
      setMessages((prev) => prev.map((m) => (m.tempId === msg.tempId ? { ...m, id: docRef.id } : m)));
    } catch (err) {
      console.error("saveMessageToFirestore", err);
    }
  }

  // Upload file to Firebase Storage
  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file || !user) return;
    const path = `user_uploads/${user.uid}/${Date.now()}_${file.name}`;
    const sRef = storageRef(storage, path);
    const uploadTask = uploadBytesResumable(sRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(pct);
      },
      (err) => {
        console.error("Upload error", err);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setUploadProgress(0);
        // send message with file URL
        sendMessage(url, { isFile: true, fileName: file.name });
      }
    );
  }

  // Text-to-speech
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    speechSynthesis.cancel(); // cancel previous
    speechSynthesis.speak(utter);
  }

  // Voice input (Web Speech API)
  function startListening() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice recognition not supported in this browser.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = function (ev) {
      const text = ev.results[0][0].transcript;
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

  // Reaction toggle
  function toggleReaction(msgId, reaction) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const reactions = m.reactions || {};
        reactions[reaction] = reactions[reaction] ? reactions[reaction] + 1 : 1;
        // persist small update: updateDoc could be used — kept local for simplicity
        return { ...m, reactions };
      })
    );
  }

  // copy message text
  function copyText(text) {
    navigator.clipboard?.writeText(text);
    alert("Copied to clipboard");
  }

  // delete message (local)
  function deleteMessage(id) {
    // For simplicity: local delete + could remove from Firestore with deleteDoc
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  // Make prompt including persona and profession (if available)
  function buildPrompt(userText) {
    const prefix = personas[selectedPersona].promptPrefix;
    let professionText = "";
    // attempt to get profession from user doc in Firestore (synchronously not possible), so we can include a hint if needed later.
    professionText = ""; // optional: you can read from Firestore and set in state for inclusion
    return `${prefix}\nUser profession: ${professionText}\nUser: ${userText}\nAssistant:`;
  }

  // sendMessage: main function
  async function sendMessage(rawText, opts = {}) {
    if ((!rawText || !rawText.trim()) && !opts.isFile) return;
    const tempId = "t_" + Date.now();
    const outgoing = {
      tempId,
      sender: "user",
      text: opts.isFile ? `Uploaded file: ${opts.fileName || rawText}` : rawText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, outgoing]);
    saveMessageToFirestore({ ...outgoing, tempId });

    setLoading(true);

    // Prepare prompt
    const prompt = opts.isFile ? `User uploaded file: ${rawText}` : buildPrompt(rawText);

    try {
      // call your AI endpoint
      const resp = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // include user ID token if required by your backend:
        body: JSON.stringify({ prompt, userId: user?.uid }),
      });

      const json = await resp.json();
      const aiText = json.response || json.reply || "Sorry, I couldn't craft an answer.";

      const botMsg = {
        sender: "bot",
        text: aiText,
        createdAt: new Date().toISOString(),
      };

      // Save bot message
      setMessages((prev) => [...prev, botMsg]);
      saveMessageToFirestore(botMsg);

      // TTS
      try {
        speak(aiText);
      } catch (e) {
        console.warn("TTS error", e);
      }
    } catch (err) {
      console.error("AI call failed", err);
      setMessages((prev) => [...prev, { sender: "bot", text: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  // UI render helpers
  function renderMessage(m) {
    return (
      <div key={m.id || m.tempId} style={m.sender === "user" ? styles.userRow : styles.botRow}>
        {m.sender !== "user" && <img src="/bot-avatar.png" alt="bot" style={styles.avatar} />}
        <div style={{ ...styles.msgBubble, background: m.sender === "user" ? "#2563eb" : "#ececec", color: m.sender === "user" ? "#fff" : "#111" }}>
          <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>

          {m.fileUrl && (
            <div style={{ marginTop: 8 }}>
              <a href={m.fileUrl} target="_blank" rel="noreferrer">Open file</a>
            </div>
          )}

          <div style={styles.msgMeta}>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={styles.iconBtn} onClick={() => copyText(m.text)}>Copy</button>
              <button style={styles.iconBtn} onClick={() => toggleReaction(m.id, "👍")}>👍</button>
              <button style={styles.iconBtn} onClick={() => toggleReaction(m.id, "❤️")}>❤️</button>
              <button style={styles.iconBtn} onClick={() => deleteMessage(m.id)}>Delete</button>
            </div>

            <div style={{ color: "#666", fontSize: 12 }}>
              {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
            </div>
          </div>

          {m.reactions && (
            <div style={{ marginTop: 6 }}>
              {Object.entries(m.reactions).map(([k, v]) => <span key={k} style={{ marginRight: 8 }}>{k} {v}</span>)}
            </div>
          )}
        </div>

        {m.sender === "user" && <img src="/user-avatar.png" alt="you" style={styles.avatar} />}
      </div>
    );
  }

  // UI
  return (
    <div style={darkMode ? styles.pageDark : styles.page}>
      <Navbar />

      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={{ margin: 0 }}>Aivora — Smart Assistant</h2>
            <div style={{ color: "#666", fontSize: 14 }}>Real AI responses, voice, uploads & history</div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select value={selectedPersona} onChange={(e) => setSelectedPersona(e.target.value)} style={styles.select}>
              {Object.entries(personas).map(([k, v]) => <option value={k} key={k}>{v.label}</option>)}
            </select>

            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
              Dark
            </label>
          </div>
        </div>

        <div style={styles.panel}>
          {/* left: chat */}
          <div style={styles.chatColumn}>
            <div style={styles.messagesWrap}>
              {messages.length === 0 && <div style={{ color: "#666" }}>No messages yet — start a conversation.</div>}
              {messages.map(renderMessage)}
              {loading && <div style={{ marginTop: 8, color: "#666" }}>Aivora is typing...</div>}
              <div ref={chatEndRef} />
            </div>

            <div style={styles.controlsRow}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Aivora anything..."
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                style={styles.input}
              />

              <button onClick={() => sendMessage(input)} style={styles.sendButton} disabled={loading}>
                Send
              </button>

              <button onClick={startListening} style={styles.voiceButton}>
                {listening ? "Listening..." : "🎤"}
              </button>

              <label style={styles.uploadLabel}>
                ⬆️
                <input type="file" style={{ display: "none" }} onChange={handleFileChange} />
              </label>
            </div>

            {uploadProgress > 0 && <div style={{ marginTop: 8 }}>Uploading: {uploadProgress}%</div>}
          </div>

          {/* right: features / suggestions */}
          <div style={styles.sideColumn}>
            <div style={styles.card}>
              <h4>Quick tips</h4>
              <ul>
                <li>Ask for step-by-step guides</li>
                <li>Upload files for the assistant to analyze</li>
                <li>Change persona for specialized replies</li>
              </ul>
            </div>

            <div style={styles.card}>
              <h4>Recent topics</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button style={styles.chip} onClick={() => sendMessage("Give me a 7-day learning plan for web dev")}>Web dev plan</button>
                <button style={styles.chip} onClick={() => sendMessage("How can I prepare for interviews?")}>Interview prep</button>
                <button style={styles.chip} onClick={() => sendMessage("Suggest safety steps if I feel unsafe")}>Safety tips</button>
              </div>
            </div>

            <div style={styles.card}>
              <h4>Chat History</h4>
              <div style={{ maxHeight: 150, overflow: "auto" }}>
                {messages.slice(-6).reverse().map((m, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <small style={{ color: "#444" }}>{m.sender === "user" ? "You: " : "Aivora: "}</small>
                    <div style={{ color: "#222" }}>{m.text.slice(0, 60)}{m.text.length>60?"...":""}</div>
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

/* --------------------------- STYLES --------------------------- */

const common = {
  containerWidth: 1100,
};

const styles = {
  page: { minHeight: "100vh", background: "#f5f7fb" },
  pageDark: { minHeight: "100vh", background: "#0b1020", color: "#fff" },

  container: { maxWidth: common.containerWidth, margin: "20px auto", padding: 16 },

  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },

  panel: { display: "flex", gap: 16 },

  chatColumn: { flex: 2, display: "flex", flexDirection: "column", gap: 10 },

  messagesWrap: { background: "transparent", padding: 12, borderRadius: 10, minHeight: 420, overflowY: "auto" },

  botRow: { display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-end" },
  userRow: { display: "flex", gap: 10, marginBottom: 12, justifyContent: "flex-end", alignItems: "flex-end" },

  avatar: { width: 36, height: 36, borderRadius: 50 },

  msgBubble: { padding: 12, borderRadius: 12, maxWidth: "78%", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },

  msgMeta: { display: "flex", justifyContent: "space-between", marginTop: 8 },

  iconBtn: { background: "transparent", border: "none", cursor: "pointer", color: "#555" },

  controlsRow: { display: "flex", gap: 8, alignItems: "center", marginTop: 6 },

  input: { flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ddd" },

  sendButton: { padding: "10px 14px", background: "#0b84ff", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },

  voiceButton: { padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer" },

  uploadLabel: { padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer" },

  sideColumn: { width: 320, display: "flex", flexDirection: "column", gap: 12 },

  card: { background: "#fff", padding: 12, borderRadius: 8, boxShadow: "0 3px 8px rgba(0,0,0,0.06)" },

  select: { padding: 8, borderRadius: 8 },

  chip: { padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#f6f7fb", cursor: "pointer" },
};

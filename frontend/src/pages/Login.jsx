import React, { useState } from "react";
import { auth, db } from "../services/AuthContext";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profession, setProfession] = useState("");

  const navigate = useNavigate();

  // LOGIN
  const handleLogin = async () => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      // Fetch saved profession
      const userRef = doc(db, "users", result.user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        alert("No profession found. Please signup.");
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      alert(err.message);
    }
  };

  // SIGNUP
  const handleSignup = async () => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Save profession to Firestore
      await setDoc(doc(db, "users", result.user.uid), {
        email: email,
        profession: profession,
      });

      navigate("/dashboard");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Login / Signup</h2>

      <input 
        type="email" 
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      /><br/><br/>

      <input 
        type="password" 
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      /><br/><br/>

      {/* NEW PROFESSION INPUT FOR SIGNUP */}
      <input 
        type="text"
        placeholder="Your Profession (Student, Doctor, Engineer...)"
        value={profession}
        onChange={(e) => setProfession(e.target.value)}
      /><br/><br/>

      <button onClick={handleLogin}>Login</button>
      <button onClick={handleSignup} style={{ marginLeft: 10 }}>Signup</button>
    </div>
  );
}

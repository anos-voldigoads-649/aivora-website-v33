import React, { useState } from "react";
import Navbar from "../components/Navbar";
import { auth } from "../services/AuthContext";
import { generateSkill } from "../services/api";

export default function Skills() {
  const [field, setField] = useState("");
  const [result, setResult] = useState(null);

  async function generate() {
    const token = auth.currentUser
      ? await auth.currentUser.getIdToken()
      : null;

    const data = await generateSkill(token, { field });
    setResult(data);
  }

  return (
    <div>
      <Navbar />

      <div style={{ padding: 20 }}>
        <h2>Skill Development</h2>

        <input
          placeholder="Your field (e.g., IT, medical, agriculture...)"
          value={field}
          onChange={(e) => setField(e.target.value)}
        />

        <button onClick={generate}>Generate Roadmap</button>

        {result && (
          <div style={{ marginTop: 20 }}>
            <h3>Learning Roadmap</h3>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

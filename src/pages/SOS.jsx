import React, { useState } from "react";
import Navbar from "../components/Navbar";
import { auth } from "../services/AuthContext";
import { sendSOS } from "../services/api";

export default function SOS() {
  const [status, setStatus] = useState("");

  async function triggerSOS() {
    setStatus("Getting location...");

    if (!navigator.geolocation) {
      return setStatus("Geolocation not supported");
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        try {
          const token = auth.currentUser
            ? await auth.currentUser.getIdToken()
            : null;

          await sendSOS(token, location);

          setStatus("🚨 SOS sent successfully!");
        } catch (error) {
          console.error(error);
          setStatus("Failed to send SOS");
        }
      },
      () => setStatus("Permission denied")
    );
  }

  return (
    <div>
      <Navbar />
      <div style={{ padding: 20 }}>
        <h2>Emergency SOS</h2>

        <button
          onClick={triggerSOS}
          style={{
            background: "red",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            fontSize: "18px",
          }}
        >
          SEND SOS
        </button>

        <p>{status}</p>
      </div>
    </div>
  );
}

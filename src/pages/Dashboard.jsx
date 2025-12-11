import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../services/AuthContext";
import { db } from "../services/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const [profession, setProfession] = useState("");

  // Load profession from Firestore
  useEffect(() => {
    if (!user) return;

    const fetchProfession = async () => {
      const userRef = doc(db, "users", user.uid);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        setProfession(snapshot.data().profession || "Not set");
      }
    };

    fetchProfession();
  }, [user]);

  return (
    <div>
      <Navbar />

      <div style={{ padding: "20px" }}>
        {/* HEADER CARD */}
        <div
          style={{
            background: "#f0f0f0",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "25px",
          }}
        >
          <h2 style={{ marginBottom: "5px" }}>
            Welcome, {user?.email || "User"} 👋
          </h2>

          <p style={{ fontSize: "16px", marginBottom: "10px" }}>
            <b>Profession:</b> {profession}
          </p>

          <p style={{ color: "#555" }}>
            Explore personalized tools designed just for your profession.
          </p>
        </div>

        {/* FEATURE CARDS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          {/* Chat */}
          <FeatureCard
            title="AI Chat Assistant"
            desc="Ask anything, get smart answers."
            link="/chat"
          />

          {/* SOS */}
          <FeatureCard
            title="Emergency SOS"
            desc="Instant emergency support."
            link="/sos"
          />

          {/* Skills */}
          <FeatureCard
            title="Skill Development"
            desc="Learn new skills for your profession."
            link="/skills"
          />

          {/* Map */}
          <FeatureCard
            title="Live Map"
            desc="Track live map and nearby help."
            link="/map"
          />

          {/* Profile */}
          <FeatureCard
            title="Profile Settings"
            desc="Update your personal details."
            link="/profile"
          />
        </div>
      </div>
    </div>
  );
}

/* Card Component */
function FeatureCard({ title, desc, link }) {
  return (
    <Link
      to={link}
      style={{
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
          transition: "0.2s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
        onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <h3>{title}</h3>
        <p style={{ color: "#666", marginTop: "8px" }}>{desc}</p>
      </div>
    </Link>
  );
}

import React from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/">AIVORA</Link>

      <div>
        <Link to="/">Home</Link>
        <Link to="/login">Login</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/chat">Chat</Link>
        <Link to="/sos">SOS</Link>
        <Link to="/skills">Skills</Link>
        <Link to="/map">Map</Link>
        <Link to="/profile">Profile</Link>
      </div>
    </nav>
  );
}

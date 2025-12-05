import React from "react";
import Navbar from "../components/Navbar";

export default function MapView() {
  return (
    <div>
      <Navbar />
      <div style={{ padding: 20 }}>
        <h2>Live Location Map</h2>
        <p>
          Coming soon: Google Maps integration using{" "}
          <code>VITE_GOOGLE_MAPS_API_KEY</code>.
        </p>
      </div>
    </div>
  );
}

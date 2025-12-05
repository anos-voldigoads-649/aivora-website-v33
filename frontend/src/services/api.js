import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE || "";

export async function postAIChat(token, text) {
  const res = await axios.post(`${BASE}/aiChat`, { text }, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.data;
}

export async function sendSOS(token, location) {
  const res = await axios.post(`${BASE}/triggerSOS`, { location }, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.data;
}

export async function generateSkill(token, profile) {
  const res = await axios.post(`${BASE}/generateSkill`, { profile }, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.data;
}
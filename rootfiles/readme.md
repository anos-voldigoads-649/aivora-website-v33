# AIVORA — Full Production Build

This project contains:

- React (Vite) frontend
- Firebase Authentication
- Firestore Database
- Firebase Cloud Functions
- AI Chat (OpenAI)
- SOS Alert System
- Skill Recommendation System

## 🚀 Setup Guide

### 1. Install Dependencies

Frontend:

```
cd frontend
npm install
npm run dev
```

Functions:

```
cd functions
npm install
firebase deploy --only functions
```

### 2. Add Firebase Config

Edit:
`frontend/src/config/firebaseConfig.js`

### 3. Set OpenAI Key

```
firebase functions:config:set openai.key="YOUR_KEY"
```

### 4. Deploy Hosting

```
firebase deploy --only hosting
```

// src/services/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { initializeApp } from "firebase/app";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

import { getStorage } from "firebase/storage";

/* ----------------------------------------------------
   🔥 YOUR FIREBASE CONFIG
---------------------------------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyDWOk2bXsTLkqIrQOV598rmbuiyx-XVeUQ",
  authDomain: "aivora-41e35.firebaseapp.com",
  projectId: "aivora-41e35",
  storageBucket: "aivora-41e35.appspot.com",
  messagingSenderId: "840811130990",
  appId: "1:840811130990:web:5b06e2e623145806fab67f",
};

/* ----------------------------------------------------
   🔥 Initialize Firebase
---------------------------------------------------- */
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/* ----------------------------------------------------
   🔥 Create Context
---------------------------------------------------- */
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

/* ----------------------------------------------------
   🔥 AuthProvider
---------------------------------------------------- */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------
     👤 Listen to login/logout
  ------------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const profileRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(profileRef);

        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          // Create default profile
          await setDoc(profileRef, {
            email: currentUser.email,
            name: "",
            profession: "",
            avatar: "",
            createdAt: new Date(),
          });

          setProfile({
            email: currentUser.email,
            name: "",
            profession: "",
            avatar: "",
          });
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* -------------------------------------------
     🔐 Login
  ------------------------------------------- */
  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  /* -------------------------------------------
     🆕 Signup + default profile
  ------------------------------------------- */
  const signup = async (email, password) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", res.user.uid), {
      email,
      name: "",
      profession: "",
      avatar: "",
      createdAt: new Date(),
    });

    return res;
  };

  /* -------------------------------------------
     🚪 Logout
  ------------------------------------------- */
  const logout = () => signOut(auth);

  /* -------------------------------------------
     📝 Update Profile
  ------------------------------------------- */
  const updateProfileData = async (data) => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, { ...profile, ...data }, { merge: true });
    setProfile((prev) => ({ ...prev, ...data }));
  };

  const value = {
    user,
    profile,
    loading,
    login,
    signup,
    logout,
    updateProfileData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

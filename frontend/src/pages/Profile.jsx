import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../services/AuthContext";
import { db, storage } from "../services/AuthContext";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Profile() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const [profilePic, setProfilePic] = useState("");
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState("");
  const [profession, setProfession] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");

  // Load user data
  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      const refUser = doc(db, "users", user.uid);
      const snap = await getDoc(refUser);

      if (snap.exists()) {
        const data = snap.data();
        setProfilePic(data.profilePic || "");
        setName(data.name || "");
        setProfession(data.profession || "");
        setPhone(data.phone || "");
        setAge(data.age || "");
        setBio(data.bio || "");
      }
      setLoading(false);
    };

    loadUserData();
  }, [user]);

  // Save Profile Data
  const saveChanges = async () => {
    const refUser = doc(db, "users", user.uid);

    await setDoc(
      refUser,
      {
        name,
        profession,
        phone,
        age,
        bio,
        email: user.email,
        profilePic,
      },
      { merge: true }
    );

    setEditMode(false);
    alert("Profile updated successfully!");
  };

  // Upload Profile Picture
  const uploadImage = async (file) => {
    if (!file) return;

    setUploading(true);

    const imgRef = ref(storage, `profilePics/${user.uid}.jpg`);
    await uploadBytes(imgRef, file);
    const url = await getDownloadURL(imgRef);

    setProfilePic(url);
    setUploading(false);

    alert("Profile picture updated!");
  };

  if (loading)
    return <p style={{ padding: 20 }}>Loading profile...</p>;

  return (
    <div>
      <Navbar />

      <div style={{ padding: 20, maxWidth: 650, margin: "0 auto" }}>
        <h2 style={{ marginBottom: 20 }}>My Profile</h2>

        <div
          style={{
            background: "#fff",
            padding: 20,
            borderRadius: 12,
            boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
          }}
        >
          {/* PROFILE PICTURE */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <img
              src={
                profilePic ||
                "https://cdn-icons-png.flaticon.com/512/147/147144.png"
              }
              alt="Profile"
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid #ddd",
              }}
            />

            {editMode && (
              <div style={{ marginTop: 10 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadImage(e.target.files[0])}
                />
                {uploading && <p>Uploading...</p>}
              </div>
            )}
          </div>

          {/* INFORMATION FIELDS */}
          <ProfileField label="Email" value={user.email} disabled />

          <ProfileField
            label="Full Name"
            value={name}
            editable={editMode}
            onChange={setName}
          />

          <ProfileField
            label="Profession"
            value={profession}
            editable={editMode}
            onChange={setProfession}
          />

          <ProfileField
            label="Phone Number"
            value={phone}
            editable={editMode}
            onChange={setPhone}
          />

          <ProfileField
            label="Age"
            value={age}
            editable={editMode}
            onChange={setAge}
          />

          <ProfileField
            label="Bio / About You"
            value={bio}
            editable={editMode}
            onChange={setBio}
            textarea
          />

          {/* BUTTONS */}
          {!editMode ? (
            <button onClick={() => setEditMode(true)} style={buttonStyle}>
              Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={saveChanges}
                style={{ ...buttonStyle, background: "#28a745" }}
              >
                Save Changes
              </button>

              <button
                onClick={() => setEditMode(false)}
                style={{ ...buttonStyle, background: "#dc3545", marginLeft: 10 }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* REUSABLE FIELD COMPONENT */
function ProfileField({ label, value, editable, onChange, textarea, disabled }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <p style={{ marginBottom: 5 }}>
        <b>{label}:</b>
      </p>

      {disabled ? (
        <p>{value}</p>
      ) : editable ? (
        textarea ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: "100%",
              height: 80,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
        )
      ) : (
        <p style={{ color: "#444" }}>{value || "Not set"}</p>
      )}
    </div>
  );
}

const buttonStyle = {
  padding: "10px 18px",
  border: "none",
  color: "white",
  background: "#007bff",
  cursor: "pointer",
  borderRadius: 8,
  marginTop: 10,
};

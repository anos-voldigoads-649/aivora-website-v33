const admin = require("firebase-admin");
const fs = require("fs");

// Load Firebase service account
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Load skills JSON
const skills = JSON.parse(fs.readFileSync("seed_skills.json", "utf8")).skills;

async function importSkills() {
  for (const skill of skills) {
    await db.collection("skills").doc(skill.field).set(skill);
    console.log("Added skill:", skill.field);
  }
  console.log("All skills added successfully!");
}

importSkills().catch(console.error);

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Configuration, OpenAIApi } = require('openai');

admin.initializeApp();
const db = admin.firestore();

const openaiKey = functions.config().openai ? functions.config().openai.key : process.env.OPENAI_KEY;
const openai = new OpenAIApi(new Configuration({ apiKey: openaiKey }));

// AI Chat Cloud Function
exports.aiChat = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin','*');
  res.set('Access-Control-Allow-Headers','Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).send('ok');

  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    const prompt = "You are AIVORA. Return JSON {\"reply\":\"...\",\"emotion\":\"calm|happy|neutral|sad|fear|anger|panic\"} for: " + text;

    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 300,
      temperature: 0.6
    });

    const raw = completion.data.choices[0].text.trim();
    let parsed = { reply: raw, emotion: "neutral" };
    try { parsed = JSON.parse(raw); } catch(e){}

    const uid = await verifyToken(req) || "anonymous";

    // Save chat
    const chatRef = db.collection('chats').doc();
    await chatRef.set({
      userId: uid,
      messages: [
        { from:'user', text, ts: admin.firestore.FieldValue.serverTimestamp() },
        { from:'ai', text: parsed.reply, emotion: parsed.emotion, ts: admin.firestore.FieldValue.serverTimestamp() }
      ]
    });

    // Panic or fear triggers SOS
    if (parsed.emotion === 'panic' || parsed.emotion === 'fear') {
      const sosRef = db.collection('sos_alerts').doc();
      await sosRef.set({
        userId: uid,
        location: null,
        detected_emotion: parsed.emotion,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active'
      });
    }

    res.json(parsed);

  } catch(err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
});

// Generate skill roadmap
exports.generateSkill = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin','*');
  res.set('Access-Control-Allow-Headers','Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).send('ok');

  try {
    const { profile } = req.body;
    if (!profile) return res.status(400).json({ error: 'Missing profile' });

    const prompt = "User profile: " + JSON.stringify(profile) + ". Generate a concise learning roadmap as JSON.";

    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 400,
      temperature: 0.7
    });

    const raw = completion.data.choices[0].text.trim();
    let parsed = { roadmap: raw };
    try { parsed = JSON.parse(raw); } catch(e){}

    res.json(parsed);

  } catch(err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
});

// Trigger SOS manually
exports.triggerSOS = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin','*');
  res.set('Access-Control-Allow-Headers','Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).send('ok');

  try {
    const { location } = req.body;
    const uid = await verifyToken(req) || "anonymous";

    const sosRef = db.collection('sos_alerts').doc();
    await sosRef.set({
      userId: uid,
      location,
      detected_emotion: null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    });

    res.json({ ok: true, id: sosRef.id });

  } catch(err) {
    console.error(err);
    res.status(500).json({ error: err.toString() });
  }
});

// Helper: verify Firebase ID token
async function verifyToken(req) {
  try {
    const header = req.get('Authorization') || '';
    if (!header.startsWith('Bearer ')) return null;
    const idToken = header.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded.uid;
  } catch(e) {
    console.warn('Token verify failed', e.message);
    return null;
  }
}

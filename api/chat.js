
// api/chat.js
export default async function handler(req, res) {
  const { prompt } = req.body;

  try {
    const result = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini", // recommended latest model
        messages: [
          { role: "system", content: "You are Aivora AI assistant." },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await result.json();

    return res.status(200).json({
      response: data?.choices?.[0]?.message?.content || "No response"
    });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return res.status(500).json({ error: "Failed to reach OpenAI" });
  }
}

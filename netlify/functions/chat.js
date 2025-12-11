export const handler = async (event) => {
  // --- CORS preflight support ---
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "OK",
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { prompt } = body;

    if (!prompt) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Missing prompt" }),
      };
    }

    // ✅ Correct key declaration
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error("❌ Missing OPENROUTER_API_KEY");
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Server error: Missing API key" }),
      };
    }

    // 🔥 ADVANCED SYSTEM MESSAGE
    const systemPrompt = `
You are AIVORA — an intelligent, friendly, highly capable AI assistant.
Rules:
- Be extremely helpful
- Give structured answers
- Never hallucinate facts
- Provide step-by-step reasoning when useful
- Support coding, debugging, study help, and real-world tasks
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aivora-v44.netlify.app",
        "X-Title": "Aivora AI",
      },
      body: JSON.stringify({
        model: "openai/gpt-4.1-mini",
        temperature: 0.7,
        max_tokens: 1000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("❌ OpenRouter API Error:", data.error);
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: data.error.message }),
      };
    }

    const aiText =
      data.choices?.[0]?.message?.content?.trim() ||
      "⚠️ AI returned no response.";

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ response: aiText }),
    };

  } catch (err) {
    console.error("❌ Server Crash:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Internal server error: " + err.message,
      }),
    };
  }
};

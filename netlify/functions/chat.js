// netlify/functions/chat.js

export const handler = async (event, context) => {
  try {
    // Parse body
    const { prompt } = JSON.parse(event.body || "{}");

    if (!prompt || prompt.trim().length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Prompt is required." }),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("❌ Missing OpenAI API Key in environment variables.");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server missing API key." }),
      };
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are Aivora, a helpful, smart, polite AI assistant. Provide clear responses.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    // If OpenAI returns a non-200 error
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenAI Error:", errorText);

      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "OpenAI API error",
          detail: errorText,
        }),
      };
    }

    const data = await response.json();

    const aiText =
      data?.choices?.[0]?.message?.content?.trim() ||
      "⚠️ Aivora could not generate a response.";

    // Success
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ response: aiText }),
    };
  } catch (error) {
    console.error("❌ Function failure:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        detail: error.message,
      }),
    };
  }
};

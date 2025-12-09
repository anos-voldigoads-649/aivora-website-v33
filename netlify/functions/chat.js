// netlify/functions/chat.js

import fetch from "node-fetch";

export const handler = async (event, context) => {
  try {
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing prompt" })
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || "No response";

    return {
      statusCode: 200,
      body: JSON.stringify({ response: aiText })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

"use strict";

const { GoogleGenAI } = require("@google/genai");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      success: false,
      error: "Only POST requests are allowed."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    return res.status(500).json({
      success: false,
      error: "GEMINI_API_KEY is missing in Vercel Environment Variables."
    });
  }

  try {
    const body = req.body || {};
    const message = body.message;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please enter a message."
      });
    }

    if (message.length > 10000) {
      return res.status(400).json({
        success: false,
        error: "Your message is too long."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey.trim()
    });

    const result = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: message.trim(),
      config: {
        systemInstruction: `
You are Lunexa AI, a friendly AI study companion.

Help students with:
- College subjects and exam preparation
- Simple explanations with examples
- Step-by-step maths solutions
- Programming in Python, Java, JavaScript, HTML, CSS and SQL
- Study notes and summaries
- Practice questions and quizzes

Use clear headings, bullet points, and readable formatting.
Be accurate, supportive, and honest.
        `.trim()
      }
    });

    const answer = result.text;

    if (typeof answer !== "string" || !answer.trim()) {
      return res.status(502).json({
        success: false,
        error: "Gemini returned an empty response. Please try again."
      });
    }

    return res.status(200).json({
      success: true,
      reply: answer.trim()
    });

  } catch (error) {
    console.error(
      "LUNEXA_GEMINI_ERROR:",
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        "Gemini request failed. Check your API configuration."
    });
  }
};

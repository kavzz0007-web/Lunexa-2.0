"use strict";

const { GoogleGenAI } = require("@google/genai");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      success: false,
      error: "Only POST requests are allowed."
    });
  }

  // Read API key securely from Vercel
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: "GEMINI_API_KEY is missing from Vercel Environment Variables."
    });
  }

  try {
    const body = req.body || {};
    const message = body.message;

    // Validate message
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please enter a message."
      });
    }

    if (message.length > 10000) {
      return res.status(400).json({
        success: false,
        error: "Your message is too long. Maximum 10000 characters."
      });
    }

    // Connect to Gemini
    const ai = new GoogleGenAI({
      apiKey: apiKey
    });

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message.trim(),
      config: {
        systemInstruction:
          "You are Lunexa AI, a friendly and intelligent AI study companion. " +
          "Help students understand difficult concepts in simple language. " +
          "Give accurate explanations, examples, and step-by-step solutions. " +
          "Create useful study notes and help with exam preparation. " +
          "Use headings and bullet points when helpful. " +
          "Be friendly, supportive, and honest when uncertain."
      }
    });

    const answer = result.text;

    if (typeof answer !== "string" || !answer.trim()) {
      return res.status(502).json({
        success: false,
        error: "Gemini returned an empty answer. Please try again."
      });
    }

    // Successful response
    return res.status(200).json({
      success: true,
      reply: answer.trim()
    });

  } catch (error) {
    // Log the real error in Vercel Function Logs
    console.error("LUNEXA_GEMINI_ERROR:", {
      message: error.message,
      status: error.status,
      code: error.code
    });

    // Return a useful diagnostic message
    const errorMessage = String(error.message || "");

    if (
      error.status === 401 ||
      error.status === 403 ||
      /api key|permission denied|unauthorized|forbidden/i.test(errorMessage)
    ) {
      return res.status(401).json({
        success: false,
        error: "Gemini API key is invalid or does not have permission. Check your Google AI Studio API key."
      });
    }

    if (
      error.status === 429 ||
      /quota|rate limit|resource exhausted/i.test(errorMessage)
    ) {
      return res.status(429).json({
        success: false,
        error: "Gemini API quota or rate limit reached. Please try again later."
      });
    }

    if (
      /model not found|not supported/i.test(errorMessage)
    ) {
      return res.status(502).json({
        success: false,
        error: "The Gemini model is unavailable for this API key. Check the model name and API access."
      });
    }

    return res.status(500).json({
      success: false,
      error: "Gemini request failed. Open Vercel Runtime Logs to see the actual error."
    });
  }
};

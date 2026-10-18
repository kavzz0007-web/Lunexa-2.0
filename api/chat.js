"use strict";

const { GoogleGenAI } = require("@google/genai");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  // Allow POST requests only
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      success: false,
      error: "Only POST requests are allowed."
    });
  }

  // Check Gemini API key
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    console.error("LUNEXA_ERROR: GEMINI_API_KEY is missing.");

    return res.status(500).json({
      success: false,
      error:
        "Gemini API key is missing. Add GEMINI_API_KEY in Vercel Environment Variables."
    });
  }

  try {
    // Read user message
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
        error: "Your message is too long. Please keep it under 10,000 characters."
      });
    }

    // Initialize Gemini
    const ai = new GoogleGenAI({
      apiKey: apiKey.trim()
    });

    // Generate AI response
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message.trim(),
      config: {
        systemInstruction: `
You are Lunexa AI, a friendly and intelligent AI study companion.

Your responsibilities:
1. Explain difficult concepts in simple language.
2. Help students prepare for college exams.
3. Provide step-by-step solutions for mathematics and programming.
4. Create study notes with headings and examples.
5. Help with Python, Java, JavaScript, HTML, CSS, SQL, statistics, and AI.
6. Summarize educational topics clearly.
7. Generate practice questions and quizzes when requested.
8. Use readable formatting and bullet points.
9. Be supportive, accurate, and student-friendly.
10. If you are unsure about something, be honest.

Respond directly to the student's question.
        `.trim()
      }
    });

    // Extract response
    const answer = result.text;

    if (typeof answer !== "string" || !answer.trim()) {
      console.error("LUNEXA_ERROR: Gemini returned an empty response.");

      return res.status(502).json({
        success: false,
        error: "Gemini returned an empty response. Please try again."
      });
    }

    // Send successful response
    return res.status(200).json({
      success: true,
      reply: answer.trim()
    });

  } catch (error) {
    // Log the actual error in Vercel function logs
    console.error(
      "LUNEXA_GEMINI_ERROR:",
      error?.message || error
    );

    // Temporary debugging response
    const errorMessage =
      typeof error?.message === "string"
        ? error.message
        : "Unknown Gemini API error";

    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

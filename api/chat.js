"use strict";

const { GoogleGenAI } = require("@google/genai");

const MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM_INSTRUCTION = `
You are Lunexa AI, a friendly and intelligent AI study companion.

Your responsibilities:
- Explain college subjects in simple language.
- Prepare exam-ready 2-mark, 8-mark, and 16-mark answers.
- Generate detailed study notes and summaries.
- Explain mathematics step by step.
- Help with Python, Java, JavaScript, HTML, CSS, and SQL.
- Generate practice questions, MCQs, and flashcards.
- Help students understand difficult concepts with examples.

Response rules:
- Use clear headings and bullet points.
- Give accurate, easy-to-understand explanations.
- Match the answer length to the user's request.
- Be friendly, supportive, and encouraging.
- Never claim to have accessed a document or website unless you actually have.
`.trim();

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function getStatusCode(error) {
  const message = String(error?.message || "");

  const status =
    Number(error?.status) ||
    Number(error?.statusCode) ||
    Number(error?.code);

  if (status >= 400 && status <= 599) {
    return status;
  }

  const match = message.match(
    /\b(429|500|502|503|504)\b/
  );

  return match ? Number(match[1]) : 500;
}

function isTemporaryError(error) {
  const status = getStatusCode(error);

  const message = String(error?.message || "")
    .toLowerCase();

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("overloaded") ||
    message.includes("temporarily unavailable") ||
    message.includes("high demand") ||
    message.includes("timeout")
  );
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");

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
      error:
        "GEMINI_API_KEY is missing. Add it in Vercel Environment Variables."
    });
  }

  try {
    const body = req.body || {};
    const message = body.message;

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Please enter a message."
      });
    }

    if (message.length > 10000) {
      return res.status(400).json({
        success: false,
        error: "Your message is too long. Keep it under 10,000 characters."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey.trim()
    });

    let result;
    let lastError;

    // Retry temporary server or rate-limit errors.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await ai.models.generateContent({
          model: MODEL,
          contents: message.trim(),
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
            maxOutputTokens: 4096
          }
        });

        break;
      } catch (error) {
        lastError = error;

        if (
          !isTemporaryError(error) ||
          attempt === 2
        ) {
          throw error;
        }

        // Wait 1.2 seconds, then 2.4 seconds.
        await sleep(1200 * (attempt + 1));
      }
    }

    if (!result) {
      throw lastError || new Error(
        "Gemini did not return a response."
      );
    }

    const answer = result.text;

    if (
      typeof answer !== "string" ||
      !answer.trim()
    ) {
      return res.status(502).json({
        success: false,
        error:
          "Gemini returned an empty response. Please try again."
      });
    }

    return res.status(200).json({
      success: true,
      reply: answer.trim()
    });

  } catch (error) {
    const status = getStatusCode(error);

    console.error("LUNEXA_GEMINI_ERROR:", {
      status,
      message: error?.message || "Unknown error",
      model: MODEL
    });

    if (isTemporaryError(error)) {
      return res.status(503).json({
        success: false,
        error:
          "Lunexa AI is temporarily busy. Please try again in a moment."
      });
    }

    if (status === 400 || status === 404) {
      return res.status(502).json({
        success: false,
        error:
          "The configured Gemini model may be invalid or unsupported. Check GEMINI_MODEL in Vercel."
      });
    }

    if (status === 401 || status === 403) {
      return res.status(502).json({
        success: false,
        error:
          "Gemini rejected the API credentials or access to this model. Check your API key and model access."
      });
    }

    return res.status(500).json({
      success: false,
      error:
        "Lunexa could not contact Gemini. Check the Vercel Runtime Logs."
    });
  }
};

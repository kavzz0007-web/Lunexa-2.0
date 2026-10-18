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

if (!apiKey) {
return res.status(500).json({
success: false,
error: "GEMINI_API_KEY is missing from Vercel Environment Variables."
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
  apiKey: apiKey
});

const result = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: message.trim(),
  config: {
    systemInstruction:
      "You are Lunexa AI, a friendly AI study companion. " +
      "Help students understand difficult subjects clearly. " +
      "Use simple explanations, examples, headings, and step-by-step " +
      "solutions when useful. Be encouraging, accurate, and honest."
  }
});

const answer = result.text;

if (!answer || !answer.trim()) {
  return res.status(502).json({
    success: false,
    error: "Gemini did not return an answer. Please try again."
  });
}

return res.status(200).json({
  success: true,
  reply: answer
});

} catch (error) {
console.error("Lunexa AI error:", error);

return res.status(500).json({
  success: false,
  error: "Gemini request failed. Check the Vercel function logs and API configuration."
});

}
};

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
error: "Gemini API key is not configured on the server."
});
}

try {
const message = req.body && req.body.message;

if (typeof message !== "string" || !message.trim()) {
  return res.status(400).json({
    success: false,
    error: "Please enter a message."
  });
}

if (message.length > 10000) {
  return res.status(400).json({
    success: false,
    error: "Your message is too long. Please shorten it."
  });
}

const ai = new GoogleGenAI({ apiKey });

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: message.trim(),
  config: {
    systemInstruction:
      "You are Lunexa AI, a friendly and supportive AI study companion. " +
      "Explain concepts clearly, help students learn step by step, " +
      "give examples when useful, and format study answers neatly. " +
      "Be encouraging, accurate, and honest when uncertain."
  }
});

const answer = response.text;

if (!answer) {
  return res.status(502).json({
    success: false,
    error: "Lunexa couldn't generate a response. Please try again."
  });
}

return res.status(200).json({
  success: true,
  reply: answer
});

} catch (error) {
console.error("Lunexa Gemini error:", error.message);

return res.status(500).json({
  success: false,
  error: "Lunexa couldn't connect to the AI. Please try again."
});

}
};

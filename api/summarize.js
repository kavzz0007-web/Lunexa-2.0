"use strict";

const { GoogleGenAI } = require("@google/genai");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Busboy = require("busboy");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_TEXT_LENGTH = 80000;

module.exports.config = {
  api: {
    bodyParser: false
  }
};

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
      error: "GEMINI_API_KEY is missing from Vercel."
    });
  }

  try {
    const { buffer, filename } = await receiveFile(req);

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please select a file to summarize."
      });
    }

    const extension = filename.split(".").pop().toLowerCase();

    let extractedText = "";

    if (extension === "txt") {
      extractedText = buffer.toString("utf8");
    } else if (extension === "pdf") {
      const pdf = await pdfParse(buffer);
      extractedText = pdf.text || "";
    } else if (extension === "docx") {
      const result = await mammoth.extractRawText({
        buffer: buffer
      });

      extractedText = result.value || "";
    } else {
      return res.status(400).json({
        success: false,
        error: "Unsupported file type. Upload PDF, TXT, or DOCX."
      });
    }

    extractedText = extractedText.trim();

    if (!extractedText) {
      return res.status(422).json({
        success: false,
        error: "No readable text found. The file may be scanned or empty."
      });
    }

    if (extractedText.length > MAX_TEXT_LENGTH) {
      extractedText = extractedText.slice(0, MAX_TEXT_LENGTH);
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey.trim()
    });

    const result = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "You are Lunexa AI, an expert study assistant.\n\n" +
                "Analyze the following study document and create:\n" +
                "1. A clear title\n" +
                "2. A short overview\n" +
                "3. Important key points\n" +
                "4. Important definitions\n" +
                "5. Exam-oriented notes\n" +
                "6. Five revision questions with answers\n\n" +
                "Use clear headings, bullet points, and simple language. " +
                "Do not invent facts that are not supported by the document.\n\n" +
                "DOCUMENT CONTENT:\n\n" +
                extractedText
            }
          ]
        }
      ]
    });

    const summary = result.text;

    if (!summary || !summary.trim()) {
      return res.status(502).json({
        success: false,
        error: "Gemini did not generate a summary. Please try again."
      });
    }

    return res.status(200).json({
      success: true,
      filename: filename,
      summary: summary.trim()
    });

  } catch (error) {
    console.error(
      "LUNEXA_SUMMARIZE_ERROR:",
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      error:
        error?.message ||
        "Could not summarize the document. Please try again."
    });
  }
};

function receiveFile(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";

    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      reject(
        new Error(
          "Please upload the file using FormData with multipart/form-data."
        )
      );
      return;
    }

    let busboy;

    try {
      busboy = Busboy({
        headers: req.headers,
        limits: {
          files: 1,
          fileSize: MAX_FILE_SIZE
        }
      });
    } catch (error) {
      reject(new Error("Invalid file upload request."));
      return;
    }

    let fileBuffer = null;
    let filename = "";
    let fileFound = false;
    let uploadError = null;

    busboy.on("file", (fieldName, stream, info) => {
      if (fieldName !== "file" || fileFound) {
        stream.resume();
        return;
      }

      fileFound = true;
      filename = info.filename || "document.txt";

      const chunks = [];
      let totalSize = 0;

      stream.on("data", (chunk) => {
        totalSize += chunk.length;

        if (totalSize <= MAX_FILE_SIZE) {
          chunks.push(chunk);
        }
      });

      stream.on("limit", () => {
        uploadError = new Error(
          "File is too large. Maximum allowed size is 5 MB."
        );
      });

      stream.on("end", () => {
        if (!uploadError) {
          fileBuffer = Buffer.concat(chunks);
        }
      });

      stream.on("error", reject);
    });

    busboy.on("filesLimit", () => {
      uploadError = new Error("Only one file can be uploaded at a time.");
    });

    busboy.on("error", reject);

    busboy.on("finish", () => {
      if (uploadError) {
        reject(uploadError);
        return;
      }

      if (!fileFound || !fileBuffer) {
        reject(new Error("No file received. Use the form field name 'file'."));
        return;
      }

      resolve({
        buffer: fileBuffer,
        filename: filename
      });
    });

    req.pipe(busboy);
  });
}

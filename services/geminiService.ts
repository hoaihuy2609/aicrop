
import { GoogleGenAI, Type } from "@google/genai";
import { DetectedItem } from "../types";

// Lấy API Key đã được Vite xử lý từ tiến trình build
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

export const detectObjects = async (
  base64Image: string,
  userPrompt: string
): Promise<DetectedItem[]> => {
  if (!API_KEY) {
    throw new Error("API Key chưa được cấu hình. Vui lòng kiểm tra file .env.local và đảm bảo biến 'VITE_GEMINI_API_KEY' đã được thiết lập.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const systemInstruction = `
    You are an expert at document analysis and object detection. 
    Your task is to identify specific sections of an image based on the user's request.
    Return a JSON list of detected items.
    Each item must have a 'label' (short description) and 'box_2d' which is an object containing normalized coordinates: ymin, xmin, ymax, xmax.
    Coordinates should be between 0 and 1000.
    
    IMPORTANT: 
    - Provide slightly generous bounding boxes to ensure no text or margins are cut off. 
    - If detecting questions, include the question number and all options (A, B, C, D).
    
    Example output format:
    [
      { "label": "Question 1", "box_2d": { "ymin": 100, "xmin": 50, "ymax": 250, "xmax": 950 } },
      { "label": "Question 2", "box_2d": { "ymin": 260, "xmin": 50, "ymax": 400, "xmax": 950 } }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: `User request: ${userPrompt}. Please identify these parts and provide their bounding boxes carefully without cutting into text.` },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(',')[1]
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              box_2d: {
                type: Type.OBJECT,
                properties: {
                  ymin: { type: Type.NUMBER },
                  xmin: { type: Type.NUMBER },
                  ymax: { type: Type.NUMBER },
                  xmax: { type: Type.NUMBER }
                },
                required: ["ymin", "xmin", "ymax", "xmax"]
              }
            },
            required: ["label", "box_2d"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI không trả về kết quả.");

    return JSON.parse(text) as DetectedItem[];
  } catch (error) {
    console.error("Gemini Detection Error:", error);
    throw error;
  }
};

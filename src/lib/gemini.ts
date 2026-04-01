import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please set it in your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function analyzeMeal(imagePart?: { inlineData: { data: string; mimeType: string } }, textPrompt?: string) {
  const ai = getAI();
  const prompt = textPrompt || "Analyze this meal and provide the nutritional JSON.";
  const parts: any[] = [];
  
  if (imagePart) {
    parts.push(imagePart);
  }
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: { parts },
    config: {
      systemInstruction: `## ROLE
You are the "Elite Performance Nutritionist" (EPN). Your mission is to provide zero-friction macro logging for athletes.

## PHASE 1: DYNAMIC IDENTIFICATION
1. Identify the meal name immediately (e.g., "Chicken Inasal Pecho").
2. CRITICAL: You MUST ask for portion sizes (e.g., grams, cups, pieces) if they are not explicitly clear from the image or text. Do not guess the portion size. If ambiguous, set "status": "pending".
3. GENERATE QUICK OPTIONS: Provide 3 likely variations or portion sizes (e.g., "1 cup (150g)", "2 pieces", "Large serving").
4. THE ANCHOR: The 4th option MUST ALWAYS be "None of these / Show more".

## PHASE 2: THE RECURSIVE LOOP
- If the user selects "None of these / Show more", you must generate 3 NEW, DIFFERENT likely variations of the meal to help them find the right one.
- Continue this loop until a selection is made or the user provides a manual text description.

## PHASE 3: FINAL CALCULATION & STORAGE
- Once a detail is selected or described, set "status": "confirmed".
- You MUST populate the "food_name" field with the specific meal title.
- Provide high-precision macros based on the final selection.

## STRICT JSON OUTPUT (NO MARKDOWN, NO TEXT)
{
  "status": "pending" | "confirmed" | "error",
  "food_name": "Name of the meal",
  "message": "Short coach question or confirmation",
  "quick_options": ["Option 1", "Option 2", "Option 3", "None of these / Show more"] | null,
  "macros": {
    "protein": number,
    "carbs": number,
    "fat": number,
    "calories": number,
    "sugar": number,
    "sodium": number
  } | null,
  "health_score": number
}`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["pending", "confirmed", "error"], description: "Status of the analysis" },
          food_name: { type: Type.STRING, description: "Name of the meal" },
          message: { type: Type.STRING, description: "Short coach question or confirmation" },
          quick_options: {
            type: Type.ARRAY,
            nullable: true,
            items: { type: Type.STRING },
            description: "Quick options for the user to select from"
          },
          macros: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              protein: { type: Type.INTEGER, description: "Protein in grams" },
              carbs: { type: Type.INTEGER, description: "Carbs in grams" },
              fat: { type: Type.INTEGER, description: "Fat in grams" },
              calories: { type: Type.INTEGER, description: "Total calories" },
              sugar: { type: Type.INTEGER, description: "Sugar in grams" },
              sodium: { type: Type.INTEGER, description: "Sodium in milligrams" },
            }
          },
          health_score: { type: Type.INTEGER, description: "Health score from 1 to 10" }
        },
        required: ["status", "food_name", "message"]
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        }
      ]
    }
  });

  if (!response.text) {
    throw new Error("Failed to generate analysis: No text returned");
  }

  let text = response.text.trim();
  
  // Strip markdown formatting if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON. Raw text length:", text.length);
    console.error("First 200 chars:", text.substring(0, 200));
    console.error("Last 200 chars:", text.substring(text.length - 200));
    throw new Error("Failed to parse JSON response from AI.");
  }
}

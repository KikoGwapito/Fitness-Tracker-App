import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please set it in your environment variables (or VITE_GEMINI_API_KEY if deploying to Vercel).");
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

  let response;
  let lastError;
  const modelsToTry = ["gemini-3-flash-preview", "gemini-3.1-flash-lite-preview"];

  for (const modelName of modelsToTry) {
    let attempt = 0;
    const MAX_RETRIES = 2;
    let success = false;

    while (attempt < MAX_RETRIES) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            systemInstruction: `## ROLE
Elite Performance Nutritionist for Gwapitometrics. High-precision macro tracking for athletes.

## PHASE 1: IDENTIFICATION & RECURSIVE LOOP
1. Identify the meal from image/text. If details are missing, status = "pending".
2. Provide 3 specific variations based on the input + "None of these / Show more".
3. IF USER CLICKS "None of these / Show more": Generate 3 NEW, DIFFERENT variations.

## PHASE 2: DATA CALCULATION
Once the user confirms a choice or describes the meal, set status = "confirmed" and calculate:
- PRIMARY: Protein (p), Carbs (c), Fats (f), Calories (cal).
- SECONDARY: Sugar (sugar_g), Sodium (sodium_mg).
- SCORE: Provide a natural health score from 1 to 10 (health_score).

## PHASE 3: OUTPUT MAPPING
- "food_name" MUST be specific (e.g., "Chicken Inasal with Java Rice").
- "message" should be a short, supportive coach insight.

## STRICT JSON ONLY (NO MARKDOWN)
{
  "status": "pending" | "confirmed",
  "food_name": "String",
  "message": "String",
  "health_score": number,
  "quick_options": ["Option 1", "Option 2", "Option 3", "None of these / Show more"],
  "macros": {
    "p": number,
    "c": number,
    "f": number,
    "cal": number,
    "sugar_g": number,
    "sodium_mg": number
  }
}`,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                status: { type: Type.STRING, enum: ["pending", "confirmed", "error"], description: "Status of the analysis" },
                food_name: { type: Type.STRING, description: "Name of the meal" },
                message: { type: Type.STRING, description: "Short coach insight" },
                health_score: { type: Type.INTEGER, description: "Health score from 1 to 10" },
                quick_options: {
                  type: Type.ARRAY,
                  nullable: true,
                  items: { type: Type.STRING },
                  description: "Quick options for the user to select from"
                },
                macros: {
                  type: Type.OBJECT,
                  properties: {
                    p: { type: Type.INTEGER, description: "Protein in grams" },
                    c: { type: Type.INTEGER, description: "Carbs in grams" },
                    f: { type: Type.INTEGER, description: "Fat in grams" },
                    cal: { type: Type.INTEGER, description: "Total calories" },
                    sugar_g: { type: Type.INTEGER, description: "Sugar in grams" },
                    sodium_mg: { type: Type.INTEGER, description: "Sodium in milligrams" },
                  },
                  required: ["p", "c", "f", "cal", "sugar_g", "sodium_mg"]
                }
              },
              required: ["status", "food_name", "message", "macros"]
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
        success = true;
        break; // Success, exit retry loop
      } catch (error: any) {
        attempt++;
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Check if it's a 503 or 429 (quota/demand) error
        if ((errorMessage.includes('503') || errorMessage.includes('429') || errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE')) && attempt < MAX_RETRIES) {
          console.warn(`[${modelName}] API high demand. Retrying attempt ${attempt} of ${MAX_RETRIES}...`);
          // Exponential backoff: 1.5s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1500));
        } else {
          // If it's not a retryable error or we're out of retries, break inner loop to try next model
          console.warn(`[${modelName}] Failed. Moving to next model if available.`);
          break;
        }
      }
    }
    
    if (success) {
      break; // Exit the model fallback loop if we got a successful response
    }
  }

  if (!response || !response.text) {
    throw lastError || new Error("Failed to generate analysis: No text returned");
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

export async function chatWithAICoach(message: string, history: any[], profile: any) {
  const ai = getAI();
  const prompt = `User Profile: Weight: ${profile?.weight_kg || 'unknown'}kg, Height: ${profile?.height_cm || 'unknown'}cm, Age: ${profile?.age || 'unknown'}, Gender: ${profile?.gender || 'unknown'}, Goal: ${profile?.goal || 'unknown'}

User Message: "${message}"`;
  
  const modelsToTry = ["gemini-3-flash-preview", "gemini-3.1-flash-lite-preview"];
  let response;
  let lastError;

  // Convert history to Gemini format
  const formattedHistory = history.map(msg => ({
    role: msg.role === 'ai' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  for (const modelName of modelsToTry) {
    try {
      const chat = ai.chats.create({
        model: modelName,
        history: formattedHistory,
        config: {
          systemInstruction: `You are an expert fitness and nutrition AI coach. 
Your goal is to answer questions ONLY related to fitness, health, and nutrition.
If the user asks about something unrelated, politely decline and steer the conversation back to health and fitness.
If the user asks about food or what to eat, provide a healthy meal suggestion tailored to their profile and goals.
If you suggest a specific meal, you MUST include a "suggested_meal" object in your JSON response so the app can log it.

Respond ONLY in JSON format:
{
  "text": "Your conversational response here",
  "suggested_meal": {
    "foodName": "Name of the meal",
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
  } | null
}`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              suggested_meal: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  foodName: { type: Type.STRING },
                  calories: { type: Type.INTEGER },
                  protein: { type: Type.INTEGER },
                  carbs: { type: Type.INTEGER },
                  fat: { type: Type.INTEGER }
                },
                required: ["foodName", "calories", "protein", "carbs", "fat"]
              }
            },
            required: ["text"]
          }
        }
      });

      response = await chat.sendMessage({ message: prompt });
      break;
    } catch (error) {
      lastError = error;
      console.warn(`[${modelName}] Failed for chatWithAICoach. Trying next...`);
    }
  }

  if (!response || !response.text) {
    throw lastError || new Error("Failed to generate AI response");
  }

  let text = response.text.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", text);
    throw new Error("Invalid response format from AI");
  }
}

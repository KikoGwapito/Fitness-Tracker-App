import { GoogleGenAI, Type } from "@google/genai";

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
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      systemInstruction: `You are an elite performance nutritionist and AI coach. Your job is to parse messy user input (images or text) of their meals and return structured JSON containing the nutritional breakdown.

### AMBIGUITY & INPUT VALIDATION PROTOCOL:
1. THE "HIDDEN VARIABLE" RULE:
Whenever a user logs a meal via photo or vague text, do NOT assume ingredients that aren't visible or stated. Trigger a Clarifying Query if any of the following are missing:
- Cooking Fats: If a protein (steak, eggs, chicken) is logged, ask: "Was this prepared with oil, butter, or was it grilled dry?"
- Hidden Bases: If a stew, curry, or stir-fry is shown in a deep bowl, ask: "Is there a base of rice, quinoa, or noodles underneath?"
- Liquid Calories: If a meal looks dry or is a "breakfast" log, ask: "Did you have a coffee, juice, or milk with this?"

2. THE CONFIDENCE THRESHOLD (VISION LOGIC):
- High Confidence (>85%): Proceed to calculate macros and set status to "confirmed".
- Low Confidence (<85%): Set status to "pending_validation" and provide a polite, performance-focused question in 'clarification_required' to narrow down the portion size or ingredient.
Example: "That salmon looks great for recovery! Is that a standard 150g fillet, or a larger cut?"

3. OUTPUT STRUCTURE:
Return a JSON object with:
- status: "pending_validation" or "confirmed"
- data: The nutritional breakdown (only if confirmed, or best estimate if pending)
- clarification_required: The question for the user if status is pending.
- reason: Why you are unsure (e.g., 'Volumetric uncertainty', 'Hidden ingredients').`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["pending_validation", "confirmed"], description: "Whether the log is ready or needs more info" },
          clarification_required: { type: Type.STRING, description: "The question to ask the user if status is pending" },
          reason: { type: Type.STRING, description: "Why the AI is unsure" },
          data: {
            type: Type.OBJECT,
            properties: {
              foodName: { type: Type.STRING, description: "A short, descriptive name for the meal" },
              macros: {
                type: Type.OBJECT,
                properties: {
                  calories: { type: Type.NUMBER, description: "Estimated total calories" },
                  protein: { type: Type.NUMBER, description: "Estimated protein in grams" },
                  carbs: { type: Type.NUMBER, description: "Estimated carbohydrates in grams" },
                  fat: { type: Type.NUMBER, description: "Estimated fat in grams" },
                },
                required: ["calories", "protein", "carbs", "fat"]
              },
              sugar_g: { type: Type.NUMBER, description: "Estimated sugar in grams" },
              sodium_mg: { type: Type.NUMBER, description: "Estimated sodium in milligrams" },
              health_score: { type: Type.NUMBER, description: "Health score from 1 to 10" },
              coach_tip: { type: Type.STRING, description: "A short, contextual coaching tip" }
            },
            required: ["foodName", "macros", "sugar_g", "sodium_mg", "health_score", "coach_tip"]
          }
        },
        required: ["status", "data"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to generate analysis");
  }

  return JSON.parse(response.text);
}

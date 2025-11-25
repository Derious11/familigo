

import { GoogleGenAI, Type } from "@google/genai";

// FIX: Per coding guidelines, API key should be taken directly from process.env and not checked for existence.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ChallengeSuggestion {
  name: string;
  target: string;
  description: string;
}

export const suggestChallenge = async (): Promise<ChallengeSuggestion | null> => {
    // FIX: Removed API key check as per guidelines, assuming it's always available.
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Suggest a fun, simple, at-home bodyweight exercise challenge for a family. Include a target like reps or time. Make the description fun and encouraging.",
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: {
                            type: Type.STRING,
                            description: "The name of the exercise.",
                        },
                        target: {
                            type: Type.STRING,
                            description: "The target for the challenge (e.g., '20 Reps' or '30 Seconds').",
                        },
                        description: {
                            type: Type.STRING,
                            description: "A short, fun, and encouraging description of the exercise.",
                        }
                    },
                    required: ["name", "target", "description"]
                }
            }
        });
        
        const jsonText = response.text.trim();
        const suggestion = JSON.parse(jsonText) as ChallengeSuggestion;
        return suggestion;

    } catch (error) {
        console.error("Error suggesting challenge from Gemini:", error);
        return null;
    }
};
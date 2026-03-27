import { GoogleGenAI } from "@google/genai";

// This function calls the real Gemini API to generate banner images.
export const generateBannerImage = async (prompt: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const enhancedPrompt = `A vibrant and energetic banner for a Tambola (bingo) game night. Theme: "${prompt}". Focus on fun and excitement, high quality, professional design.`;

        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: enhancedPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image.imageBytes) {
            return response.generatedImages[0].image.imageBytes;
        } else {
            throw new Error('API returned no image data.');
        }

    } catch (error) {
        console.error("Error generating banner image with Gemini API:", error);
        throw new Error('Failed to generate image. Please check your API key and prompt.');
    }
};
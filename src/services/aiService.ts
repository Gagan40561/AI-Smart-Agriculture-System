import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface CropInput {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  temperature: number;
  humidity: number;
  ph: number;
  rainfall: number;
  location?: string;
}

export interface PredictionResult {
  type: 'crop' | 'disease';
  result: string;
  confidence: number;
  recommendations: string[];
}

export const agricultureService = {
  async recommendCrop(input: CropInput): Promise<PredictionResult> {
    const prompt = `As an expert agricultural scientist, recommend the best crop based on these soil and environmental parameters${input.location ? ` for the region of ${input.location}` : ''}:
    Nitrogen: ${input.nitrogen}
    Phosphorus: ${input.phosphorus}
    Potassium: ${input.potassium}
    Temperature: ${input.temperature}°C
    Humidity: ${input.humidity}%
    pH: ${input.ph}
    Rainfall: ${input.rainfall}mm

    Provide your response in JSON format with the following structure:
    {
      "crop": "Name of the crop",
      "confidence": 0.0 to 1.0,
      "reasoning": "Brief explanation",
      "recommendations": ["Actionable tip 1", "Actionable tip 2"]
    }`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || '{}');
      
      // Confidence threshold check
      if (data.confidence < 0.85) {
        return {
          type: 'crop',
          result: "Inconclusive Data",
          confidence: data.confidence,
          recommendations: ["Please provide more precise soil measurements.", "Consider testing soil at a certified lab."]
        };
      }

      return {
        type: 'crop',
        result: data.crop,
        confidence: data.confidence,
        recommendations: [data.reasoning, ...data.recommendations]
      };
    } catch (error) {
      console.error("Crop recommendation error:", error);
      throw new Error("Failed to get crop recommendation.");
    }
  },

  async detectDisease(base64Image: string): Promise<PredictionResult> {
    const prompt = `As a plant pathologist, analyze this image of a plant leaf and identify any diseases. 
    Provide your response in JSON format:
    {
      "disease": "Name of the disease or 'Healthy'",
      "confidence": 0.0 to 1.0,
      "description": "Brief description of the symptoms",
      "treatment": ["Treatment step 1", "Treatment step 2"]
    }`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] || base64Image } }
        ],
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || '{}');

      // Confidence threshold check
      if (data.confidence < 0.80) {
        return {
          type: 'disease',
          result: "Low Confidence Detection",
          confidence: data.confidence,
          recommendations: ["The image quality might be too low.", "Please retake the photo in better lighting.", "Ensure the leaf is clearly visible."]
        };
      }

      return {
        type: 'disease',
        result: data.disease,
        confidence: data.confidence,
        recommendations: [data.description, ...data.treatment]
      };
    } catch (error) {
      console.error("Disease detection error:", error);
      throw new Error("Failed to detect plant disease.");
    }
  },

  async generateMarketInsights(marketData: any[]): Promise<string> {
    const dataSummary = marketData.map(d => `${d.commodity}: ₹${d.modal_price} (${d.trend > 0 ? '+' : ''}${d.trend}%)`).join(', ');
    const prompt = `As an agricultural market analyst, provide a concise (2-3 sentences) market insight based on the following real-time crop price trends in India: ${dataSummary}. 
    Focus on which crops are good to sell, which to hold, and any significant price movements.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      return response.text || "Market trends are currently stable. Monitor daily for significant changes.";
    } catch (error) {
      console.error("Market insight error:", error);
      return "Unable to generate AI insights at this moment.";
    }
  }
};

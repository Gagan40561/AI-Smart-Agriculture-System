import { GoogleGenAI } from "@google/genai";

const getGeminiApiKey = () => {
  const viteKey = import.meta.env?.VITE_GEMINI_API_KEY;
  const serverKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  return viteKey || serverKey || '';
};

let aiClient: GoogleGenAI | null = null;

const getGeminiClient = () => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }

  return aiClient;
};

const isGeminiKeyError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('API_KEY_INVALID') || message.includes('API key') || message.includes('API_KEY');
};

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

const getFallbackCropRecommendation = (input: CropInput, reason: string): PredictionResult => {
  const isAcidic = input.ph < 6;
  const isAlkaline = input.ph > 7.8;
  const isWet = input.rainfall >= 180 || input.humidity >= 75;
  const isDry = input.rainfall < 80 || input.humidity < 45;
  const isCool = input.temperature < 20;
  const isHot = input.temperature > 32;

  let crop = 'Maize';
  let rationale = 'Balanced soil and moderate weather conditions are suitable for maize or similar cereal crops.';

  if (isWet && !isAlkaline) {
    crop = 'Rice';
    rationale = 'High rainfall or humidity favors water-intensive crops like rice.';
  } else if (isDry || isHot) {
    crop = 'Millet';
    rationale = 'Dry or hot conditions favor drought-tolerant crops like millet.';
  } else if (isCool) {
    crop = 'Wheat';
    rationale = 'Cooler temperatures are suitable for wheat and other rabi crops.';
  } else if (isAcidic) {
    crop = 'Potato';
    rationale = 'Slightly acidic soil can support potato when moisture is managed well.';
  } else if (isAlkaline) {
    crop = 'Cotton';
    rationale = 'Mildly alkaline soil and warm conditions can support cotton with proper irrigation.';
  }

  return {
    type: 'crop',
    result: crop,
    confidence: 0.72,
    recommendations: [
      `${reason} Using a local rule-based recommendation instead.`,
      rationale,
      'Verify with a local soil test before final sowing decisions.',
      'Keep nitrogen, phosphorus, and potassium balanced for the chosen crop.'
    ]
  };
};

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

    const ai = getGeminiClient();
    if (!ai) {
      console.warn('Gemini API key is not configured. Set VITE_GEMINI_API_KEY for the Vite frontend or GEMINI_API_KEY for server-side usage.');
      return getFallbackCropRecommendation(input, 'Gemini is not configured.');
    }

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
      if (isGeminiKeyError(error)) {
        return getFallbackCropRecommendation(input, 'Gemini rejected the configured API key.');
      }
      return getFallbackCropRecommendation(input, 'Gemini is temporarily unavailable.');
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

    const ai = getGeminiClient();
    if (!ai) {
      return {
        type: 'disease',
        result: 'AI Diagnosis Unavailable',
        confidence: 0,
        recommendations: [
          'Gemini is not configured. Set VITE_GEMINI_API_KEY for the frontend build or GEMINI_API_KEY for server-side usage.',
          'Retake the photo in clear daylight and consult a local agronomist for a confirmed diagnosis.'
        ]
      };
    }

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
      if (isGeminiKeyError(error)) {
        return {
          type: 'disease',
          result: 'AI Diagnosis Unavailable',
          confidence: 0,
          recommendations: [
            'Gemini rejected the configured API key. Check the Render environment variable value.',
            'For now, monitor the plant closely and ask a local expert if symptoms spread.'
          ]
        };
      }
      throw new Error("Failed to detect plant disease.");
    }
  },

  async generateMarketInsights(marketData: any[]): Promise<string> {
    const dataSummary = marketData.map(d => `${d.commodity}: ₹${d.modal_price} (${d.trend > 0 ? '+' : ''}${d.trend}%)`).join(', ');
    const prompt = `As an agricultural market analyst, provide a concise (2-3 sentences) market insight based on the following real-time crop price trends in India: ${dataSummary}. 
    Focus on which crops are good to sell, which to hold, and any significant price movements.`;

    const ai = getGeminiClient();
    if (!ai) {
      return "AI insights are unavailable because Gemini is not configured. Review the listed market prices directly and prefer selling crops with positive price trends.";
    }

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

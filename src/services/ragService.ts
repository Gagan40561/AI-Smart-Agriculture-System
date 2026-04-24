import { GoogleGenAI } from "@google/genai";
import agricultureKnowledge from '../data/agriculture_knowledge.json';

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

interface KnowledgeChunk {
  id: string;
  topic: string;
  content: string;
  keywords: string[];
  embedding?: number[];
}

let knowledgeBase: KnowledgeChunk[] = agricultureKnowledge;

const CACHE_KEY = 'agri_knowledge_embeddings';

// Load cached embeddings from localStorage
const loadCachedEmbeddings = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const cacheMap = JSON.parse(cached);
      knowledgeBase.forEach(chunk => {
        if (cacheMap[chunk.id] && cacheMap[chunk.id].content === chunk.content) {
          chunk.embedding = cacheMap[chunk.id].embedding;
        }
      });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Failed to load cached embeddings:", error);
    }
  }
};

// Save embeddings to localStorage
const saveEmbeddingsToCache = () => {
  try {
    const cacheMap: Record<string, { content: string, embedding: number[] }> = {};
    knowledgeBase.forEach(chunk => {
      if (chunk.embedding) {
        cacheMap[chunk.id] = {
          content: chunk.content,
          embedding: chunk.embedding
        };
      }
    });
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheMap));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Failed to save embeddings to cache:", error);
    }
  }
};

// Initialize embeddings for the knowledge base
export const initKnowledgeBase = async () => {
  console.log("Initializing knowledge base embeddings...");
  const ai = getGeminiClient();
  if (!ai) {
    console.warn("Gemini API key is not configured. Skipping knowledge base embeddings.");
    return;
  }
  
  // 1. Load from cache first
  loadCachedEmbeddings();
  
  const chunksToEmbed = knowledgeBase.filter(chunk => !chunk.embedding);
  if (chunksToEmbed.length === 0) {
    console.log("All chunks already have embeddings (cached or pre-defined).");
    return;
  }

  console.log(`Need to embed ${chunksToEmbed.length} new chunks.`);

  try {
    // Batch embedding request
    const result = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: chunksToEmbed.map(chunk => chunk.content)
    });

    // Map embeddings back to chunks
    result.embeddings.forEach((embedding, index) => {
      chunksToEmbed[index].embedding = embedding.values;
    });

    saveEmbeddingsToCache();
    console.log(`Successfully embedded ${chunksToEmbed.length} chunks.`);
  } catch (error: any) {
    // If batch fails, try individual with delay and retries
    const isRateLimit = error?.status === "RESOURCE_EXHAUSTED" || 
                        error?.code === 429 || 
                        error?.error?.code === 429 ||
                        error?.message?.includes("quota") ||
                        error?.message?.includes("429");
    
    if (isRateLimit) {
      if (import.meta.env.DEV) {
        console.warn("Rate limit hit during batch embedding, falling back to individual with delay...");
      }
      
      for (const chunk of chunksToEmbed) {
        let retries = 5;
        let success = false;
        
        while (retries > 0 && !success) {
          try {
            const result = await ai.models.embedContent({
              model: "gemini-embedding-2-preview",
              contents: [chunk.content]
            });
            chunk.embedding = result.embeddings[0].values;
            saveEmbeddingsToCache();
            success = true;
            // Increased delay between successful individual requests to avoid hitting rate limits
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (err: any) {
            const isChunkRateLimit = err?.status === "RESOURCE_EXHAUSTED" || 
                                     err?.code === 429 || 
                                     err?.error?.code === 429 ||
                                     err?.message?.includes("quota") ||
                                     err?.message?.includes("429");
            
            if (isChunkRateLimit) {
              retries--;
              const delay = (6 - retries) * 8000; // Increased progressive backoff: 8s, 16s, 24s, 32s, 40s
              if (import.meta.env.DEV) {
                console.warn(`Rate limit hit for chunk ${chunk.id}, retrying in ${delay}ms... (${retries} retries left)`);
              }
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.error(`Error embedding chunk ${chunk.id}:`, err);
              break; // Non-rate limit error, stop retrying this chunk
            }
          }
        }
      }
    } else {
      console.error("Error initializing knowledge base embeddings:", error);
    }
  }
  
  console.log("Knowledge base embeddings initialization complete.");
};

// Cosine similarity
const cosineSimilarity = (vecA: number[], vecB: number[]) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Retrieve top-k chunks
const retrieveChunks = async (query: string, k: number = 2) => {
  const ai = getGeminiClient();
  if (!ai) {
    const queryTokens = query.toLowerCase().split(/\W+/).filter(Boolean);
    return knowledgeBase
      .map(chunk => ({
        ...chunk,
        score: chunk.keywords.filter(keyword => queryTokens.includes(keyword.toLowerCase())).length
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  let retries = 3;
  while (retries > 0) {
    try {
      const result = await ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: [query]
      });
      const queryEmbedding = result.embeddings[0].values;

      const scoredChunks = knowledgeBase.map(chunk => ({
        ...chunk,
        score: chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0
      }));

      return scoredChunks
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
    } catch (error: any) {
      const isRateLimit = error?.status === "RESOURCE_EXHAUSTED" || 
                          error?.code === 429 || 
                          error?.error?.code === 429 ||
                          error?.message?.includes("quota") ||
                          error?.message?.includes("429");
      
      if (isRateLimit) {
        retries--;
        const delay = (4 - retries) * 3000;
        if (import.meta.env.DEV) {
          console.warn(`Rate limit hit during retrieval, retrying in ${delay}ms...`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error("Error retrieving chunks:", error);
        return [];
      }
    }
  }
  return [];
};

export const generateChatResponse = async (query: string, history: any[] = []) => {
  // 1. Retrieve relevant context
  const relevantChunks = await retrieveChunks(query);
  const context = relevantChunks.map(c => c.content).join("\n\n");
  const ai = getGeminiClient();

  if (!ai) {
    if (context) {
      return `Gemini is not configured right now, but I found this from the local agriculture guide:\n\n${context}`;
    }

    return "Gemini is not configured right now. Please set VITE_GEMINI_API_KEY for the frontend build or GEMINI_API_KEY for server-side usage, then redeploy.";
  }

  // 2. Detect intent and generate response
  const systemInstruction = `You are a helpful AI Farmer Assistant for the "Smart Agriculture" app. 
  Your goal is to provide short, clear, and practical agricultural advice.
  
  Use the following context if relevant to the user's query:
  ${context}
  
  If the user asks about a disease, crop, market, or weather, provide a structured answer:
  - Problem: (Briefly state the issue)
  - Cause: (What causes it)
  - Solution: (Actionable steps)
  - Prevention: (How to avoid it in the future)
  
  If the context doesn't contain the answer, use your general agricultural knowledge but keep it practical and concise.
  Always be polite and encouraging to the farmer.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
        { role: 'user', parts: [{ text: query }] }
      ],
      config: {
        systemInstruction: systemInstruction
      }
    });

    return response.text || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Chat generation error:", error);
    return "I'm having trouble connecting to my knowledge base. Please try again later.";
  }
};


import type { Trip } from '../types';

/**
 * Gemini service with two modes:
 * - remote: uses the Google GenAI client (requires API key and VITE_AI_MODE=remote)
 * - local: free template-based fallbacks (default) that incur no remote charges
 */

const AI_MODE = (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_AI_MODE : undefined) as string | undefined
  || (typeof window !== 'undefined' ? (window as any).__REVROM_AI_MODE__ : undefined) as string | undefined
  || 'local';
const isRemote = AI_MODE === 'remote';

// Lazy-init remote client only when needed. Throws helpful errors when running local mode.
const getAi = async () => {
  if (!isRemote) throw new Error('AI is running in local mode. Set VITE_AI_MODE=remote to enable remote Gemini calls.');
  const { GoogleGenAI } = await import('@google/genai');
  const viteKey = (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_GOOGLE_API_KEY : undefined) as string | undefined;
  const nodeKey = (typeof process !== 'undefined' && (process as any).env && (process as any).env.API_KEY) as string | undefined;
  const windowKey = (typeof window !== 'undefined' ? (window as any).__REVROM_API_KEY__ : undefined) as string | undefined;
  const apiKey = viteKey || nodeKey || windowKey;
  if (!apiKey) throw new Error('Missing AI API key. Set VITE_GOOGLE_API_KEY or API_KEY in environment.');
  return new GoogleGenAI({ apiKey });
};

/**
 * Transcription service using gemini-3-flash-preview
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  if (!isRemote) return Promise.resolve('');
  const ai = await getAi();
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(audioBlob);
  });
  const base64Data = await base64Promise;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: audioBlob.type } },
        { text: "Transcribe this audio accurately. If it's empty, return an empty string." }
      ]
    }
  });
  return response.text || "";
};

/**
 * Fast Chat using gemini-flash-lite-latest
 */
export const fastChat = async (prompt: string): Promise<string> => {
  if (!isRemote) return Promise.resolve(`AI disabled (local mode). Prompt received: ${prompt.slice(0, 280)}`);
  const ai = await getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: prompt,
  });
  return response.text || "No response.";
};

/**
 * Complex Assistant with Thinking Mode and Grounding
 */
export const complexAssistant = async (
  message: string, 
  history: any[] = [], 
  grounding: 'none' | 'search' | 'maps' = 'none',
  useThinking: boolean = false
): Promise<{ text: string; sources?: any[] }> => {
  if (!isRemote) {
    const short = message.length > 400 ? message.slice(0, 400) + '...' : message;
    return { text: `Offline mode: enable remote AI to get detailed answers. You asked: ${short}` };
  }
  const ai = await getAi();
  const config: any = {
    systemInstruction: "You are the Revrom.in Adventure Strategist. You provide deep travel insights for Himalayan motorcycle expeditions. For complex queries, use detailed reasoning. For location queries, provide accurate maps-grounded info.",
  };

  if (useThinking) {
    // Fix: thinkingBudget is guide for reasoning tokens.
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  const model = useThinking ? 'gemini-3-pro-preview' : 
                (grounding === 'maps' ? 'gemini-2.5-flash' : 'gemini-3-flash-preview');

  if (grounding === 'search') {
    config.tools = [{ googleSearch: {} }];
  } else if (grounding === 'maps') {
    config.tools = [{ googleMaps: {} }];
  }

  const response = await ai.models.generateContent({
    model,
    contents: [...history, { role: 'user', parts: [{ text: message }] }],
    config,
  });

  return { 
    text: response.text || "", 
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks 
  };
};

/**
 * Image Generation with gemini-3-pro-image-preview
 */
export const generateImage = async (prompt: string, size: '1K' | '2K' | '4K', aspect: string): Promise<string> => {
  if (!isRemote) throw new Error('Image generation disabled in local mode.');
  const ai = await getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      imageConfig: {
        imageSize: size,
        aspectRatio: aspect as any,
      }
    }
  });

  // Fix: Iterate through parts to find the image part as per guidelines.
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Generation failed.");
};

/**
 * Image Analysis and Editing
 */
export const processExpeditionImage = async (base64: string, prompt: string, mode: 'analyze' | 'edit'): Promise<any> => {
  if (!isRemote) return Promise.resolve(`Image processing disabled in local mode.`);
  const ai = await getAi();
  const model = mode === 'analyze' ? 'gemini-3-pro-preview' : 'gemini-2.5-flash-image';
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64.split(',')[1], mimeType: 'image/jpeg' } },
        { text: prompt }
      ]
    }
  });

  if (mode === 'edit' && response.candidates?.[0]?.content?.parts) {
    // Fix: Iterate through parts for edited image data.
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  // Fix: Access response.text directly.
  return response.text;
};

/**
 * Veo 3 Video Generation
 */
export const generateVideo = async (prompt: string, startImage?: string): Promise<string> => {
  if (!isRemote) throw new Error('Video generation disabled in local mode.');
  const ai = await getAi();
  const params: any = {
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
  };
  if (startImage) {
    params.image = { imageBytes: startImage.split(',')[1], mimeType: 'image/png' };
  }

  let operation = await ai.models.generateVideos(params);
  while (!operation.done) {
    await new Promise(r => setTimeout(r, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }
  const link = operation.response?.generatedVideos?.[0]?.video?.uri;
  // Fix: Append API key to the download link as per guidelines.
  return `${link}&key=${(typeof process !== 'undefined' && (process as any).env) ? (process as any).env.API_KEY : ''}`;
};

/**
 * Speech Generation
 */
export const speak = async (text: string): Promise<Uint8Array> => {
  if (!isRemote) throw new Error('Speech synthesis disabled in local mode.');
  const ai = await getAi();
  const { Modality } = await import('@google/genai');
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
    }
  });
  const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64) throw new Error("TTS failed");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/**
 * Live API connection helper
 */
export const connectExpeditionLive = (callbacks: any) => {
  if (!isRemote) throw new Error('Live connection disabled in local mode.');
  const connect = async () => {
    const ai = await getAi();
    const { Modality } = await import('@google/genai');
    return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Zephyr'}}},
        systemInstruction: "You are the Revrom Expedition Radio. High energy, rugged, and adventurous guide.",
        outputAudioTranscription: {},
        inputAudioTranscription: {}
      }
    });
  };
  return { connect };
};

// Fix: Added generatePackingList export for TripDetailPage
/**
 * Generates a tailored packing list for a specific trip using Gemini.
 */
export const generatePackingList = async (trip: Trip): Promise<string> => {
  if (!isRemote) {
    const days = Number(trip.duration) || 3;
    const items = [
      'Helmet (DOT/ISI certified)',
      'Riding jacket with armor',
      'Sturdy riding pants',
      'Waterproof riding boots',
      'Layering clothing (base, mid, insulated)',
      'Gloves (riding + warm)',
      'Balaclava / neck gaiter',
      'Basic first-aid kit',
      'Personal meds and sunscreen',
      'Tool kit and spare tubes',
      'Power bank and chargers'
    ];
    if (days > 5) items.push('Laundry soap / quick-dry clothing');
    if (trip.difficulty && trip.difficulty.toLowerCase().includes('hard')) items.push('Extra fuel can and heavy-duty repair kit');
    return Promise.resolve(`Packing list for ${trip.title || trip.destination} (${days} days):\n- ${items.join('\n- ')}`);
  }
  const ai = await getAi();
  const prompt = `Generate a comprehensive motorcycle trip packing list for a ${trip.duration}-day trip to ${trip.destination}. 
  The difficulty level is ${trip.difficulty}. 
  Focus on gear, clothing (layering), safety, and personal essentials for high-altitude Himalayan conditions.
  The itinerary includes: ${trip.itinerary.map(i => i.title).join(', ')}.
  Return the list in a clear, formatted string.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text || "Could not generate packing list.";
};

// Fix: Added generateCustomItinerary export for CustomizePage
/**
 * Generates a custom itinerary based on user preferences using Gemini.
 */
export const generateCustomItinerary = async (formData: any, availableTrips: Trip[]): Promise<string> => {
  if (!isRemote) {
    const days = Number(formData.duration) || 3;
    const dests = (formData.destinations || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const title = `Custom ${days}-day ${formData.style || 'adventure'} itinerary for ${formData.travelers || 'riders'}`;
    let md = `# ${title}\n\n`;
    for (let i = 1; i <= days; i++) {
      const dest = dests[(i - 1) % Math.max(1, dests.length)] || availableTrips[(i - 1) % Math.max(1, availableTrips.length)]?.title || 'Scenic route';
      md += `### Day ${i}: ${dest}\n- Ride: ${Math.max(60, 80 - i * 5)} km along mixed terrain.\n- Highlights: mountain passes, local villages, rugged campsites.\n- Tips: pack warm layers, check tire pressure, carry spare fuel for remote stages.\n\n`;
    }
    md += `**Interests:** ${formData.interests || 'Adventure, culture'}\n`;
    md += `\n_Offline mode: enable remote AI for a richer, more detailed itinerary._`;
    return Promise.resolve(md);
  }
  const ai = await getAi();
  const prompt = `Act as an expert Himalayan motorcycle tour architect. 
  Create a custom ${formData.duration}-day itinerary for ${formData.travelers} riders.
  Destinations: ${formData.destinations}.
  Style: ${formData.style}.
  Interests: ${formData.interests}.
  Reference our existing tours if applicable: ${availableTrips.map(t => t.title).join(', ')}.
  The output should be in Markdown format with a title (#) and day-by-day highlights (### Day X: Title).
  Include rugged, frontier-style advice consistent with Revrom.in's Chushul roots.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });
  return response.text || "Could not generate custom itinerary.";
};


import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MagicPet } from "@/types";

export const generatePetImage = async (pet: MagicPet, drawingBase64?: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  // Prompt optimized to follow the child's drawing shapes but polish it to 3D Pixar style
  // We use Google Search to find real animal references for better realism
  const prompt = `Convert this simple child's drawing into a high-quality, professional 3D stylized character. 
    Style: 3D toy figurine, smooth matte plastic texture, soft ambient occlusion, studio lighting.
    The character is a cute ${pet.baseAnimal} with magical powers of ${pet.element}. 
    Features: Large expressive eyes, rounded soft shapes, clean silhouettes, professional 3D render (Octane/Redshift style).
    STRICTLY follow the shapes, pose, and composition of the drawing provided. 
    Background: Minimalist, soft pastel colors, magical atmosphere matching ${pet.element}.
    Quality: High-end 3D animation character design, similar to modern 3D mobile games or high-quality 3D toys.`;

  try {
    const parts: any[] = [{ text: prompt }];
    
    if (drawingBase64) {
      const base64Data = drawingBase64.split(',')[1];
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: 'image/png'
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        },
        tools: [
          {
            googleSearch: {
              searchTypes: {
                webSearch: {},
                imageSearch: {},
              }
            },
          },
        ],
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image part found in response");
  } catch (error) {
    console.error("Error generating image:", error);
    return `https://picsum.photos/seed/${pet.name}/512/512`;
  }
};

export const generatePetStory = async (pet: MagicPet): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const prompt = `Escribe un cuento muy corto (3 frases) para un niño de 5 años sobre una mascota mágica llamada ${pet.name}. 
    Es un ${pet.baseAnimal} con poderes de ${pet.element}. Su personalidad es ${pet.personality}. 
    Asegúrate de que sea una historia feliz y mágica en español.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "¡Tu mascota está lista para jugar!";
  } catch (error) {
    console.error("Error generating story:", error);
    return `¡Había una vez un valiente ${pet.baseAnimal} llamado ${pet.name} que amaba el ${pet.element}!`;
  }
};

export const generatePetMetadata = async (prompt: string): Promise<{ name: string, baseAnimal: string, element: string, personality: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Basado en esta descripción: "${prompt}", genera los datos para una mascota mágica. 
        El animal base debe ser EXACTAMENTE uno de estos: León, Gatito, Panda, Conejo, Dragón, Zorro.
        El elemento debe ser EXACTAMENTE uno de estos: Fuego, Hielo, Naturaleza, Estrellas, Caramelos.
        Responde SOLO en formato JSON con estas llaves: name, baseAnimal, element, personality.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            baseAnimal: { type: Type.STRING },
            element: { type: Type.STRING },
            personality: { type: Type.STRING },
          },
          required: ["name", "baseAnimal", "element", "personality"],
        },
      },
    });
    
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Error generating metadata:", e);
    return { name: "Mágico", baseAnimal: "Gatito", element: "Estrellas", personality: "Curioso" };
  }
};

export const speakStory = async (text: string): Promise<void> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Lee este cuento de forma alegre y dulce: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), audioCtx, 24000, 1);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch (error) {
    console.error("Error with TTS:", error);
  }
};

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

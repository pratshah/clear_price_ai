import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config({ path: '../.env' });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
(async () => {
    try {
      await ai.models.embedContent({ model: 'gemini-embedding-2', contents: 'hello', config: { outputDimensionality: 768 } });
      console.log(`gemini-embedding-2 with 768 worked`);
    } catch(e) {
      console.error(`gemini-embedding-2 with 768 failed: ${e.message}`);
    }
})();

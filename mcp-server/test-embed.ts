import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config({ path: '../.env' });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
(async () => {
  const models = ['text-embedding-004', 'models/text-embedding-004', 'gemini-embedding-001', 'models/gemini-embedding-001', 'gemini-embedding-2', 'models/gemini-embedding-2'];
  for (const m of models) {
    try {
      await ai.models.embedContent({ model: m, contents: 'hello' });
      console.log(`${m} worked`);
    } catch(e) {
      console.error(`${m} failed: ${e.message}`);
    }
  }
})();

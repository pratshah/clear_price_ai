import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config({ path: '../.env' });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
(async () => {
  const models = await ai.models.listModels({});
  for await (const m of models) {
    if (m.name.includes('embed')) console.log(m.name);
  }
})();

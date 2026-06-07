import { GoogleGenAI } from '@google/genai';
import type { OcrResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY! });

export async function scanReceipt(base64Image: string): Promise<OcrResult> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: 'Extract receipt info. Reply ONLY with valid JSON: {"amount": number or null, "merchant": "string or null", "date": "YYYY-MM-DD or null", "currency": "3-letter code or null", "category": "food|transport|accommodation|activities|shopping|other"}. Pick the category that best matches the receipt type. If you cannot find a value, use null.',
          },
        ],
      },
    ],
  });

  const raw = response.text ?? '';

  if (!raw) throw new Error('Empty response from vision API');

  const jsonStr = raw.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
  const parsed = JSON.parse(jsonStr);
  return {
    amount: parsed.amount ?? null,
    merchant: parsed.merchant ?? null,
    date: parsed.date ?? null,
    currency: parsed.currency ?? null,
    category: parsed.category ?? null,
    raw,
  };
}

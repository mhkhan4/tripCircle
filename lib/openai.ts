import OpenAI from 'openai';
import type { OcrResult } from '../types';

// DeepSeek is OpenAI-API-compatible — same SDK, different base URL + model
const client = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY!,
  baseURL: 'https://api.deepseek.com/v1',
  dangerouslyAllowBrowser: true,
});

export async function scanReceipt(base64Image: string): Promise<OcrResult> {
  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'low' },
          },
          {
            type: 'text',
            text: `Extract receipt info. Reply ONLY with valid JSON: {"amount": number or null, "merchant": "string or null", "date": "YYYY-MM-DD or null", "currency": "USD or relevant 3-letter code or null"}. If you cannot find a value, use null.`,
          },
        ],
      },
    ],
    max_tokens: 150,
  });

  const raw = response.choices[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(raw);
    return {
      amount: parsed.amount ?? null,
      merchant: parsed.merchant ?? null,
      date: parsed.date ?? null,
      currency: parsed.currency ?? null,
      raw,
    };
  } catch {
    return { amount: null, merchant: null, date: null, currency: null, raw };
  }
}

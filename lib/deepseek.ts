import DeepSeekClient from 'openai';
import type { OcrResult } from '../types';

const client = new DeepSeekClient({
  apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY!,
  baseURL: 'https://api.deepseek.com/v1',
  dangerouslyAllowBrowser: true,
});

export async function scanReceipt(base64Image: string): Promise<OcrResult> {
  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
          {
            type: 'text',
            text: 'Extract receipt info. Reply ONLY with valid JSON: {"amount": number or null, "merchant": "string or null", "date": "YYYY-MM-DD or null", "currency": "3-letter code or null", "category": "food|transport|accommodation|activities|shopping|other"}. Pick the category that best matches the receipt type. If you cannot find a value, use null.',
          },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '';

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

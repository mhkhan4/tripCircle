import Anthropic from '@anthropic-ai/sdk';
import type { OcrResult } from '../types';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY!,
  dangerouslyAllowBrowser: true,
});

export async function scanReceipt(base64Image: string): Promise<OcrResult> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
          },
          {
            type: 'text',
            text: 'Extract receipt info. Reply ONLY with valid JSON: {"amount": number or null, "merchant": "string or null", "date": "YYYY-MM-DD or null", "currency": "3-letter code or null", "category": "food|transport|accommodation|activities|shopping|other"}. Pick the category that best matches the receipt type. If you cannot find a value, use null.',
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  const raw = textBlock?.text ?? '{}';

  try {
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
  } catch {
    return { amount: null, merchant: null, date: null, currency: null, category: null, raw };
  }
}

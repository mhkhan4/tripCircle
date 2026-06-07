import type { OcrResult } from '../types';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

export async function scanReceipt(base64Image: string): Promise<OcrResult> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY!;

  const response = await fetch(`${BASE_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              text: 'Extract receipt info. Reply ONLY with valid JSON: {"amount": number or null, "merchant": "string or null", "date": "YYYY-MM-DD or null", "currency": "3-letter code or null", "category": "food|transport|accommodation|activities|shopping|other"}. Pick the category that best matches the receipt type. If you cannot find a value, use null.',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const json = await response.json();
  const raw: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!raw) throw new Error('Empty response from Gemini');

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

import type { NextApiRequest, NextApiResponse } from 'next';
import { ParsedReceipt } from '@/types/receipt';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

type ErrorResponse = {
  error: string;
  raw_response?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParsedReceipt | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please analyze this receipt image and extract the following information in JSON format:
{
  "restaurant_name": "name of the restaurant",
  "items": [
    {
      "name": "item name",
      "price": 0.00,
      "quantity": 1
    }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "tip": 0.00,
  "total": 0.00
}

Important:
- Extract ALL line items from the receipt
- Prices should be numbers (not strings)
- Tip may also be referred to as "Service Charge" or "Gratuity", or any other common reference to tips
- If a field is not found, use null
- If quantity is not specified, assume 1
- Return ONLY valid JSON, no additional text`
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API error:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'Failed to parse receipt'
      });
    }

    const content = data.choices[0].message.content;

    let parsedReceipt: ParsedReceipt;
    try {
      const jsonString = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedReceipt = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', content);
      return res.status(500).json({
        error: 'Failed to parse receipt data',
        raw_response: content
      });
    }

    return res.status(200).json(parsedReceipt);

  } catch (error) {
    console.error('Error parsing receipt:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
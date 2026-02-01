import type { NextApiRequest, NextApiResponse } from 'next';
import { createSession } from '@/lib/sessionStore';
import { ParsedReceipt, CustomItem } from '@/types/receipt';

interface CreateSessionRequest {
  receipt: ParsedReceipt;
  customItems: CustomItem[];
  priceOverrides: Record<number, number>;
  quantityOverrides: Record<number, number>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { receipt, customItems, priceOverrides, quantityOverrides } =
      req.body as CreateSessionRequest;

    if (!receipt || !receipt.items) {
      return res.status(400).json({ error: 'Invalid receipt data' });
    }

    const session = await createSession(
      receipt,
      customItems || [],
      priceOverrides || {},
      quantityOverrides || {}
    );

    return res.status(200).json({
      success: true,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ error: 'Failed to create session' });
  }
}
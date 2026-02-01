import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession, allItemsClaimed, setSessionCalculated } from '@/lib/sessionStore';
import { calculateSplitFromClaims } from '@/lib/calculations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Session ID required' });
  }

  const session = await getSession(id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // If already calculated, return the existing results
  if (session.isCalculated && session.splitResults) {
    return res.status(200).json({
      success: true,
      results: session.splitResults,
      alreadyCalculated: true,
    });
  }

  // Verify all items are claimed
  if (!allItemsClaimed(session)) {
    return res.status(400).json({
      success: false,
      error: 'Not all items have been claimed',
    });
  }

  // Calculate the split
  const results = calculateSplitFromClaims(session);

  // Save results and lock the session
  await setSessionCalculated(id, results);

  return res.status(200).json({
    success: true,
    results,
    alreadyCalculated: false,
  });
}
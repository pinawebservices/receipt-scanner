import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession, allItemsClaimed } from '@/lib/sessionStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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

  return res.status(200).json({
    session,
    allItemsClaimed: allItemsClaimed(session),
  });
}
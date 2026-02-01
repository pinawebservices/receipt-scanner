import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession, addParticipant } from '@/lib/sessionStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { name } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Session ID required' });
  }

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  const session = await getSession(id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.isCalculated) {
    return res.status(400).json({ error: 'Session has already been calculated' });
  }

  const success = await addParticipant(id, name.trim());

  if (!success) {
    return res.status(500).json({ error: 'Failed to join session' });
  }

  // Fetch updated session to get current participants list
  const updatedSession = await getSession(id);

  return res.status(200).json({
    success: true,
    participants: updatedSession?.participants || [],
  });
}
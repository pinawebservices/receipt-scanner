import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession, claimItem, unclaimItem } from '@/lib/sessionStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { itemKey, personName, quantity, action } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Session ID required' });
  }

  if (!itemKey || typeof itemKey !== 'string') {
    return res.status(400).json({ error: 'Item key required' });
  }

  if (!personName || typeof personName !== 'string' || personName.trim() === '') {
    return res.status(400).json({ error: 'Person name required' });
  }

  const session = await getSession(id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.isCalculated) {
    return res.status(400).json({ error: 'Session has already been calculated - items are locked' });
  }

  // Handle unclaim action
  if (action === 'unclaim') {
    const result = await unclaimItem(id, itemKey, personName.trim());
    return res.status(result.success ? 200 : 400).json(result);
  }

  // Handle claim action (default)
  const claimQuantity = typeof quantity === 'number' ? quantity : 1;

  if (claimQuantity < 0) {
    return res.status(400).json({ error: 'Quantity must be non-negative' });
  }

  const result = await claimItem(id, itemKey, personName.trim(), claimQuantity);

  if (!result.success) {
    return res.status(409).json(result); // 409 Conflict for race condition
  }

  return res.status(200).json(result);
}
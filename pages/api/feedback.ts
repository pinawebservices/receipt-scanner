import type { NextApiRequest, NextApiResponse } from 'next';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 60; // 1 hour in seconds
const FEEDBACK_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message must be 1000 characters or less' });
    }

    // Rate limiting by IP
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown';

    const rateLimitKey = `feedback_ratelimit:${ip}`;
    const count = await redis.incr(rateLimitKey);

    if (count === 1) {
      await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW);
    }

    if (count > RATE_LIMIT_MAX) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    // Store feedback
    const feedbackKey = `feedback:${Date.now()}`;
    const payload = {
      message: message.trim(),
      ip,
      userAgent: req.headers['user-agent'] || '',
      createdAt: new Date().toISOString(),
    };

    await redis.setex(feedbackKey, FEEDBACK_TTL, JSON.stringify(payload));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving feedback:', error);
    return res.status(500).json({ error: 'Failed to save feedback' });
  }
}

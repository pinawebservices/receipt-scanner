import Redis from 'ioredis';
import { Session, ParsedReceipt, CustomItem } from '@/types/receipt';

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL!);

// Key prefix for sessions
const SESSION_PREFIX = 'session:';

// Session expiry time (24 hours in seconds)
const SESSION_EXPIRY = 24 * 60 * 60;

// Generate a random 8-character alphanumeric session ID
export function generateSessionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create a new session
export async function createSession(
  receipt: ParsedReceipt,
  customItems: CustomItem[],
  priceOverrides: Record<number, number>,
  quantityOverrides: Record<number, number>
): Promise<Session> {
  let id = generateSessionId();

  // Ensure unique ID
  while (await redis.exists(`${SESSION_PREFIX}${id}`)) {
    id = generateSessionId();
  }

  const session: Session = {
    id,
    receipt,
    customItems,
    priceOverrides,
    quantityOverrides,
    participants: [],
    claims: {},
    isCalculated: false,
    splitResults: null,
    createdAt: Date.now(),
  };

  await redis.setex(`${SESSION_PREFIX}${id}`, SESSION_EXPIRY, JSON.stringify(session));
  return session;
}

// Get a session by ID
export async function getSession(id: string): Promise<Session | null> {
  const data = await redis.get(`${SESSION_PREFIX}${id}`);
  if (!data) return null;
  return JSON.parse(data) as Session;
}

// Save a session (internal helper)
async function saveSession(session: Session): Promise<void> {
  await redis.setex(`${SESSION_PREFIX}${session.id}`, SESSION_EXPIRY, JSON.stringify(session));
}

// Add a participant to a session
export async function addParticipant(sessionId: string, name: string): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;

  // Don't add duplicates
  if (!session.participants.includes(name)) {
    session.participants.push(name);
    await saveSession(session);
  }
  return true;
}

// Get the effective quantity for an item in a session
export function getItemQuantity(session: Session, itemIndex: number): number {
  if (session.quantityOverrides[itemIndex] !== undefined) {
    return session.quantityOverrides[itemIndex];
  }
  return session.receipt.items[itemIndex]?.quantity || 1;
}

// Get total claimed quantity for an item
export function getClaimedQuantity(session: Session, itemKey: string): number {
  const itemClaims = session.claims[itemKey] || [];
  return itemClaims.reduce((sum, claim) => sum + claim.quantity, 0);
}

// Claim an item (or part of it) - returns success/failure with reason
export async function claimItem(
  sessionId: string,
  itemKey: string,
  personName: string,
  quantity: number
): Promise<{ success: boolean; error?: string; claimedBy?: string }> {
  const session = await getSession(sessionId);
  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  if (session.isCalculated) {
    return { success: false, error: 'Session has already been calculated' };
  }

  // Determine max quantity for this item
  let maxQuantity: number;
  if (itemKey.startsWith('custom_')) {
    const customId = itemKey.replace('custom_', '');
    const customItem = session.customItems.find(item => item.id === customId);
    if (!customItem) {
      return { success: false, error: 'Item not found' };
    }
    maxQuantity = customItem.quantity;
  } else {
    const itemIndex = parseInt(itemKey, 10);
    maxQuantity = getItemQuantity(session, itemIndex);
  }

  // Calculate how much is already claimed by others
  const currentClaims = session.claims[itemKey] || [];
  const claimedByOthers = currentClaims
    .filter(c => c.personName !== personName)
    .reduce((sum, c) => sum + c.quantity, 0);

  // Check if there's enough remaining
  const available = maxQuantity - claimedByOthers;
  if (quantity > available) {
    // Find who has claimed it
    const otherClaimers = currentClaims
      .filter(c => c.personName !== personName)
      .map(c => c.personName);

    return {
      success: false,
      error: 'Not enough quantity available',
      claimedBy: otherClaimers.join(', '),
    };
  }

  // Remove any existing claim by this person on this item
  const otherClaims = currentClaims.filter(c => c.personName !== personName);

  // Add the new claim (if quantity > 0)
  if (quantity > 0) {
    session.claims[itemKey] = [
      ...otherClaims,
      { personName, quantity, claimedAt: Date.now() },
    ];
  } else {
    // Quantity 0 means unclaim
    session.claims[itemKey] = otherClaims;
  }

  await saveSession(session);
  return { success: true };
}

// Unclaim an item
export async function unclaimItem(
  sessionId: string,
  itemKey: string,
  personName: string
): Promise<{ success: boolean; error?: string }> {
  return claimItem(sessionId, itemKey, personName, 0);
}

// Check if all items are fully claimed
export function allItemsClaimed(session: Session): boolean {
  // Check parsed items
  for (let i = 0; i < session.receipt.items.length; i++) {
    const itemKey = String(i);
    const maxQuantity = getItemQuantity(session, i);
    const claimed = getClaimedQuantity(session, itemKey);
    if (claimed !== maxQuantity) {
      return false;
    }
  }

  // Check custom items
  for (const customItem of session.customItems) {
    const itemKey = `custom_${customItem.id}`;
    const claimed = getClaimedQuantity(session, itemKey);
    if (claimed !== customItem.quantity) {
      return false;
    }
  }

  return true;
}

// Mark session as calculated and store results
export async function setSessionCalculated(
  sessionId: string,
  results: Session['splitResults']
): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;

  session.isCalculated = true;
  session.splitResults = results;
  await saveSession(session);
  return true;
}
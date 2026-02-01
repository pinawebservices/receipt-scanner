export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

export interface ParsedReceipt {
  restaurant_name: string | null;
  items: ReceiptItem[];
  subtotal: number | null;
  tax: number | null;
  tip: number | null;
  total: number | null;
}

// Single assignment: one person paying for X quantity of an item
export interface ItemAssignment {
  name: string;
  quantity: number;
}

// Maps item index (or custom item id) to array of assignments (multiple people can share an item)
export type ItemAssignments = Record<number | string, ItemAssignment[]>;

// Calculated total for a single person
export interface PersonTotal {
  name: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

// Custom item added by user (for missing items)
export interface CustomItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// ============================================
// Collaborative Session Types
// ============================================

// A single claim on an item by a participant
export interface ItemClaim {
  personName: string;
  quantity: number;
  claimedAt: number; // timestamp for ordering
}

// Maps item key to array of claims (supports multi-quantity claiming)
export type SessionClaims = Record<string, ItemClaim[]>;

// A collaborative bill-splitting session
export interface Session {
  id: string;
  receipt: ParsedReceipt;
  customItems: CustomItem[];
  priceOverrides: Record<number, number>;
  quantityOverrides: Record<number, number>;
  participants: string[]; // People who have joined
  claims: SessionClaims;
  isCalculated: boolean;
  splitResults: PersonTotal[] | null;
  createdAt: number;
}

// API response for claim operations
export interface ClaimResult {
  success: boolean;
  error?: string;
  claimedBy?: string; // Who already claimed it (on conflict)
}

// Session state for the frontend
export interface SessionState {
  session: Session | null;
  currentUser: string | null;
  allItemsClaimed: boolean;
}
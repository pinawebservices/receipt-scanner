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